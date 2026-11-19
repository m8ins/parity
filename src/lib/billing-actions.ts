import { activeRate } from './calculations';
import { exclusiveEnd, validPeriodEnd } from './billing-period';
import { conditionErrors, rateSnapshot, type ConditionValues } from './conditions';
import { setupNumber } from './meter-setup';
import type { Contract, Rate } from './types';

export function billingPeriodSnapshot(periods: Contract[]) {
  return [...periods].sort((a, b) => a.id.localeCompare(b.id)).map(period => ({
    id: period.id, period_start: period.period_start, period_end: period.period_end ?? null,
    provider: period.provider ?? null, settlement_amount: period.settlement_amount ?? null,
    settlement_date: period.settlement_date ?? null,
  }));
}
export function continuationInitialRate(_period: Contract, rates: Rate[], start: string) {
  return activeRate(rates, start);
}
export interface ContinuationInput {
  start: string; end: string; provider: string; values: ConditionValues; confirmBoundary: boolean;
}
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
export function continuationErrors(period: Contract, periods: Contract[], rates: Rate[], input: ContinuationInput, gas: boolean) {
  const errors: Partial<Record<'start' | 'end' | 'confirmBoundary' | 'provider' | keyof ConditionValues, string>> = {};
  if (periods.some(other => other.id !== period.id && other.period_start >= period.period_start)) errors.start = 'Bitte den neuesten Abrechnungszeitraum fortführen.';
  else if (!validDate(input.start) || input.start <= period.period_start) errors.start = 'Der neue Beginn muss nach dem bisherigen Beginn liegen.';
  if (!validPeriodEnd(input.end, input.start)) errors.end = 'Bitte ein gültiges Ende ab dem neuen Beginn eingeben.';
  const later = rates.filter(rate => rate.effective_from > input.start);
  if (input.end && validPeriodEnd(input.end, input.start) && later.some(rate => rate.effective_from >= exclusiveEnd(input.end)!)) errors.end = 'Spätere Konditionen liegen außerhalb dieses Endes. Bitte Ende oder Konditionen prüfen.';
  if (later.some(rate => !validDate(rate.effective_from) || [rate.grundpreis, rate.arbeitspreis, rate.abschlag].some(value => !Number.isFinite(value) || value < 0) || !Number.isFinite(rate.umrechnungsfaktor) || rate.umrechnungsfaktor <= 0 || (!gas && rate.umrechnungsfaktor !== 1))) errors.start = 'Ungültige spätere Konditionen bitte zuerst in der Historie klären.';
  if (new Set(later.map(rate => rate.effective_from)).size !== later.length) errors.start = 'Spätere Konditionen enthalten doppelte Daten. Bitte zuerst die Historie klären.';
  if ((!period.period_end || input.start !== period.period_end || later.length > 0) && !input.confirmBoundary) errors.confirmBoundary = 'Bitte die Änderung der Grenzen, eine mögliche Lücke und die Übernahme späterer Konditionen bestätigen.';
  const valueErrors = conditionErrors({ ...period, period_start: input.start, period_end: undefined }, [], input.start, input.values, gas, 'create');
  for (const key of ['grundpreis', 'arbeitspreis', 'abschlag', 'umrechnungsfaktor'] as const) if (valueErrors[key]) errors[key] = valueErrors[key];
  return errors;
}
export function continuationPayload(period: Contract, periods: Contract[], rates: Rate[], input: ContinuationInput, gas: boolean) {
  return { period_id: period.id, expected_periods: billingPeriodSnapshot(periods), expected_rates: rateSnapshot(rates),
    period_start: input.start, period_end: exclusiveEnd(input.end), provider: input.provider.trim() || null,
    confirm_boundary: input.confirmBoundary, confirm_gap: input.confirmBoundary, confirm_future: input.confirmBoundary,
    grundpreis: setupNumber(input.values.grundpreis), arbeitspreis: setupNumber(input.values.arbeitspreis),
    abschlag: setupNumber(input.values.abschlag), umrechnungsfaktor: gas ? setupNumber(input.values.umrechnungsfaktor) : 1 };
}
export type ContinuationPayload = ReturnType<typeof continuationPayload>;
export function settlementPayload(period: Contract, amount: number, date: string) {
  return { p_period_id: period.id, p_expected_period: { period_start: period.period_start, period_end: period.period_end ?? null },
    p_expected_amount: period.settlement_amount ?? null, p_expected_date: period.settlement_date ?? null, p_amount: amount, p_date: date };
}
