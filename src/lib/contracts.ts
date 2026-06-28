import type { SupabaseClient } from "@supabase/supabase-js";
import { Contract, Rate, Reading, MeterData } from "./types";

/**
 * Loads every billing period of a meter together with its rates and readings.
 * Works with both the browser and server Supabase clients.
 */
export async function loadMeterData(
  supabase: SupabaseClient,
  meterId: string,
): Promise<MeterData> {
  const { data: contractsData } = await supabase
    .from("contracts")
    .select("*")
    .eq("meter_id", meterId)
    .order("period_start", { ascending: false });

  const contracts = (contractsData as Contract[]) || [];

  const [ratesRes, readingsRes] = await Promise.all([
    contracts.length
      ? supabase
          .from("rates")
          .select("*")
          .in(
            "contract_id",
            contracts.map((c) => c.id),
          )
          .order("effective_from", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("readings")
      .select("*")
      .eq("meter_id", meterId)
      .order("date", { ascending: true }),
  ]);

  const ratesByContract: Record<string, Rate[]> = {};
  for (const rate of (ratesRes.data as Rate[]) || []) {
    (ratesByContract[rate.contract_id] ??= []).push(rate);
  }

  return {
    contracts,
    ratesByContract,
    readings: (readingsRes.data as Reading[]) || [],
  };
}

function monthYear(year: number, monthIndex: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

/**
 * Short label for a billing period as a month range, e.g.
 * "Oct 2025 – Oct 2026", plus the provider when set. A single-month period
 * collapses to just "Oct 2025". Used in the period switcher.
 *
 * period_end is the exclusive boundary (the next period's start), so the last
 * covered day is one day earlier. When period_end is absent we derive +1 year,
 * matching the projection. `locale` defaults to en-US; pass the active UI locale.
 */
export function formatPeriodLabel(
  contract: Contract,
  locale: string = "en-US",
): string {
  const [sy, sm] = contract.period_start.split("-").map(Number);
  const startLabel = monthYear(sy, sm - 1, locale);

  const endIso = contract.period_end ?? addOneYear(contract.period_start);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const lastDay = new Date(ey, em - 1, ed - 1); // exclusive end → last covered day
  const endLabel = monthYear(lastDay.getFullYear(), lastDay.getMonth(), locale);

  const range =
    startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
  return contract.provider ? `${range} · ${contract.provider}` : range;
}

/**
 * Adds one year to an ISO date string (YYYY-MM-DD), preserving month/day.
 * Pure string math to avoid timezone drift.
 */
export function addOneYear(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${Number(y) + 1}-${m}-${d}`;
}

export interface RolloverOverrides {
  period_start?: string; // ISO YYYY-MM-DD
  period_end?: string; // ISO YYYY-MM-DD
  provider?: string;
  abschlag?: number;
}

export interface RolloverResult {
  contract: Contract;
  rate: Rate | null;
}

/**
 * Starts a new billing period for a meter — both the regular yearly rollover
 * and a mid-year provider/contract switch.
 *
 * - New period starts where the current one ends (period_end, or
 *   period_start + 1 year if the current period is open-ended), and runs for
 *   one year — both overridable.
 * - The previous period is always truncated to end exactly at the new start, so
 *   periods never overlap. For a regular rollover this is a no-op (it already
 *   ends there); for a mid-year switch it shortens the previous period to the
 *   switch date.
 * - The latest rate is carried over into the new period (rates are scoped to a
 *   contract, so they must be duplicated).
 * - The provider defaults to the previous period's provider but can be
 *   overridden (supplier switch).
 */
export async function rolloverContract(
  supabase: SupabaseClient,
  currentContract: Contract,
  latestRate: Rate | null,
  overrides: RolloverOverrides = {},
): Promise<RolloverResult> {
  const newStart =
    overrides.period_start ??
    currentContract.period_end ??
    addOneYear(currentContract.period_start);
  const newEnd = overrides.period_end ?? addOneYear(newStart);

  // ISO dates (YYYY-MM-DD) compare correctly as strings.
  if (newStart <= currentContract.period_start) {
    throw new Error(
      `New period start (${newStart}) must be after the current period start (${currentContract.period_start}).`,
    );
  }

  // Truncate the previous period to end at the new start so periods never
  // overlap. No-op when it already ends there (regular rollover).
  if (currentContract.period_end !== newStart) {
    const { error: closeError } = await supabase
      .from("contracts")
      .update({ period_end: newStart })
      .eq("id", currentContract.id);
    if (closeError) throw closeError;
  }

  const { data: contractData, error: insertError } = await supabase
    .from("contracts")
    .insert({
      meter_id: currentContract.meter_id,
      period_start: newStart,
      period_end: newEnd,
      provider: overrides.provider ?? currentContract.provider ?? null,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  const newContract = contractData as Contract;

  let newRate: Rate | null = null;
  if (latestRate) {
    const { data: rateData, error: rateError } = await supabase
      .from("rates")
      .insert({
        contract_id: newContract.id,
        effective_from: newStart,
        grundpreis: latestRate.grundpreis,
        arbeitspreis: latestRate.arbeitspreis,
        abschlag: overrides.abschlag ?? latestRate.abschlag,
        umrechnungsfaktor: latestRate.umrechnungsfaktor,
      })
      .select()
      .single();
    if (rateError) throw rateError;
    newRate = rateData as Rate;
  }

  return { contract: newContract, rate: newRate };
}
