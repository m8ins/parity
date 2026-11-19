import type { Contract } from './types';

export function shiftDate(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function inclusiveEnd(period: Contract) {
  return period.period_end ? shiftDate(period.period_end, -1) : '';
}
export function exclusiveEnd(value: string) {
  return value ? shiftDate(value, 1) : null;
}
export function validPeriodEnd(value: string, start: string) {
  return !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value >= start);
}
export function periodIsFinished(period: Contract, today: string) {
  return Boolean(period.period_end && period.period_end <= today);
}
