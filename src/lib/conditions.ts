import { activeRate } from './calculations';
import { setupNumber } from './meter-setup';
import { formatReading } from './readings';
import type { Contract, Rate } from './types';

export const conditionFields = [
  { key: 'grundpreis', label: 'Grundpreis', unit: '€/Monat' },
  { key: 'arbeitspreis', label: 'Arbeitspreis', unit: 'ct/kWh' },
  { key: 'abschlag', label: 'Abschlag', unit: '€/Monat' },
  { key: 'umrechnungsfaktor', label: 'Umrechnungsfaktor', unit: 'kWh/m³' },
] as const;
export type ConditionKey = typeof conditionFields[number]['key'];
export type ConditionValues = Record<ConditionKey, string>;
export type ConditionOperation = 'create' | 'correct' | 'delete';
export interface ConditionRevision {
  id: string; contract_id: string; rate_id: string; operation: string;
  previous: Rate; created_at: string;
}
export function conditionValues(rate?: Rate): ConditionValues {
  return Object.fromEntries(conditionFields.map(({ key }) => [key, rate ? formatReading(rate[key]) : ''])) as ConditionValues;
}
export function rateSnapshot(rates: Rate[]) {
  return [...rates].sort((a, b) => a.id.localeCompare(b.id)).map(rate => ({
    id: rate.id, effective_from: rate.effective_from,
    grundpreis: rate.grundpreis, arbeitspreis: rate.arbeitspreis,
    abschlag: rate.abschlag, umrechnungsfaktor: rate.umrechnungsfaktor,
  }));
}
export function conditionErrors(contract: Contract, rates: Rate[], date: string, values: ConditionValues, gas: boolean, operation: ConditionOperation) {
  const errors: Partial<Record<ConditionKey | 'date', string>> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) errors.date = 'Bitte ein gültiges Datum eingeben.';
  else if (operation === 'create' && (date < contract.period_start || (contract.period_end != null && date >= contract.period_end))) errors.date = 'Das Datum muss innerhalb des ausgewählten Zeitraums liegen. Das Enddatum gehört nicht mehr dazu.';
  else if (operation === 'create' && rates.some(rate => rate.effective_from === date)) errors.date = 'Für dieses Datum sind bereits Konditionen erfasst. Nutze „Korrigieren“ in der Historie.';
  if (operation !== 'delete') for (const { key } of conditionFields.filter(field => gas || field.key !== 'umrechnungsfaktor')) {
    const number = setupNumber(values[key]);
    if (!Number.isFinite(number) || (key === 'umrechnungsfaktor' && number <= 0)) errors[key] = key === 'umrechnungsfaktor'
      ? 'Bitte einen Faktor größer als 0 mit Dezimalkomma eingeben.' : 'Bitte eine Zahl ab 0 mit Dezimalkomma eingeben. Ein leeres Feld ist keine 0.';
  }
  return errors;
}
export function nextCondition(rates: Rate[], date: string) {
  return [...rates].filter(rate => rate.effective_from > date).sort((a, b) => a.effective_from.localeCompare(b.effective_from))[0];
}
export function conditionRange(contract: Contract, rates: Rate[], date: string) {
  const next = nextCondition(rates, date)?.effective_from;
  const start = date < contract.period_start ? contract.period_start : date;
  const end = contract.period_end ? (next && next < contract.period_end ? next : contract.period_end) : next;
  return !end || start < end ? { start, end } : null;
}
export function deletionEffect(rates: Rate[], target: Rate) {
  const remaining = rates.filter(rate => rate.id !== target.id);
  return { predecessor: activeRate(remaining, target.effective_from), next: nextCondition(remaining, target.effective_from) };
}
export function conditionPayload(contract: Contract, rates: Rate[], operation: ConditionOperation, date: string, values: ConditionValues, gas: boolean, rateId?: string) {
  return {
    contract_id: contract.id, operation, rate_id: rateId ?? null, effective_from: date,
    expected_period: { period_start: contract.period_start, period_end: contract.period_end ?? null },
    expected_rates: rateSnapshot(rates),
    ...(operation === 'delete' ? {} : {
      grundpreis: setupNumber(values.grundpreis), arbeitspreis: setupNumber(values.arbeitspreis),
      abschlag: setupNumber(values.abschlag), umrechnungsfaktor: gas ? setupNumber(values.umrechnungsfaktor) : 1,
    }),
  };
}
export type ConditionPayload = ReturnType<typeof conditionPayload>;
