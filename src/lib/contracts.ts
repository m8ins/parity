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
  const { data: contractsData, error: contractsError } = await supabase
    .from("contracts")
    .select("*")
    .eq("meter_id", meterId)
    .order("period_start", { ascending: false });
  if (contractsError) throw contractsError;

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
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("readings")
      .select("*")
      .eq("meter_id", meterId)
      .order("date", { ascending: true }),
  ]);
  if (ratesRes.error) throw ratesRes.error;
  if (readingsRes.error) throw readingsRes.error;

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
 * covered day is one day earlier. Missing period_end is displayed as open. `locale` defaults to en-US; pass the active UI locale.
 */
export function formatPeriodLabel(
  contract: Contract,
  locale: string = "en-US",
): string {
  const [sy, sm] = contract.period_start.split("-").map(Number);
  const startLabel = monthYear(sy, sm - 1, locale);

  if (!contract.period_end) {
    const label = `${startLabel} – ${locale.startsWith('de') ? 'offen' : 'open'}`;
    return contract.provider ? `${label} · ${contract.provider}` : label;
  }
  const endIso = contract.period_end;
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
