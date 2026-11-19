import { describe, expect, it } from 'vitest';
import { billingPeriodSnapshot, continuationErrors, continuationInitialRate, continuationPayload, settlementPayload, type ContinuationInput } from './billing-actions';
import type { Contract, Rate } from './types';
const period: Contract = { id: 'p', meter_id: 'm', period_start: '2025-01-01', period_end: '2026-01-01', created_at: '', updated_at: '' };
const rates: Rate[] = [{ id: 'r', contract_id: 'p', effective_from: '2025-01-01', grundpreis: 10, arbeitspreis: 30, abschlag: 0, umrechnungsfaktor: 1, created_at: '' }, { id: 's', contract_id: 'p', effective_from: '2026-01-01', grundpreis: 20, arbeitspreis: 40, abschlag: 100, umrechnungsfaktor: 1, created_at: '' }];
const input: ContinuationInput = { start: '2026-01-01', end: '', provider: ' Neu ', values: { grundpreis: '20', arbeitspreis: '40', abschlag: '0', umrechnungsfaktor: '1' }, confirmBoundary: false };
describe('billing actions', () => {
  it('uses exact transition conditions and leaves ambiguous or missing source blank', () => {
    expect(continuationInitialRate(period, rates, input.start)?.id).toBe('s');
    expect(continuationInitialRate(period, rates, '2024-01-01')).toBeUndefined();
    expect(continuationInitialRate(period, [...rates, { ...rates[1], id: 'duplicate' }], input.start)).toBeUndefined();
  });
  it('keeps explicit zero and null distinct in settlement expectations', () => {
    expect(settlementPayload(period, 0, '2026-01-05')).toMatchObject({ p_expected_amount: null, p_amount: 0 });
    expect(settlementPayload({ ...period, settlement_amount: 0 }, -123.456, '2026-01-05')).toMatchObject({ p_expected_amount: 0, p_amount: -123.456 });
  });
  it('requires confirmation for shortened/open boundaries and gaps', () => {
    expect(continuationErrors(period, [period], rates, input, false)).toEqual({});
    expect(continuationErrors(period, [period], rates, { ...input, start: '2025-12-01' }, false).confirmBoundary).toBeTruthy();
    expect(continuationErrors(period, [period], rates, { ...input, start: '2026-02-01' }, false).confirmBoundary).toBeTruthy();
  });
  it('blocks later conditions outside the inclusive input end and duplicated later dates', () => {
    const later = { ...rates[1], id: 't', effective_from: '2026-06-01' };
    expect(continuationErrors(period, [period], [...rates, later], { ...input, end: '2026-05-31', confirmBoundary: true }, false).end).toBeTruthy();
    expect(continuationErrors(period, [period], [...rates, later], { ...input, end: '2026-06-01', confirmBoundary: true }, false).end).toBeUndefined();
    expect(continuationErrors(period, [period], [...rates, later, { ...later, id: 'u' }], input, false).start).toBeTruthy();
  });
  it('accepts future starts and blocks invalid later values without guessing replacements', () => {
    expect(continuationErrors(period, [period], rates, { ...input, start: '2030-01-01', confirmBoundary: true }, false)).toEqual({});
    const invalid = { ...rates[1], effective_from: '2027-01-01', grundpreis: -1 };
    expect(continuationErrors(period, [period], [...rates, invalid], { ...input, confirmBoundary: true }, false).start).toBeTruthy();
    expect(continuationErrors(period, [period], rates, { ...input, start: period.period_start }, false).start).toBeTruthy();
  });
  it('only continues the newest period and validates actual initial values', () => {
    expect(continuationErrors(period, [period, { ...period, id: 'new', period_start: '2026-01-01' }], rates, input, false).start).toBeTruthy();
    expect(continuationErrors(period, [period], rates, { ...input, values: { ...input.values, abschlag: '' } }, false).abschlag).toBeTruthy();
  });
  it('builds a canonical whole-history expectation and converts inclusive end', () => {
    const payload = continuationPayload(period, [period], rates, { ...input, end: '2026-12-31', confirmBoundary: true }, false);
    expect(payload).toMatchObject({ period_id: 'p', period_end: '2027-01-01', provider: 'Neu', abschlag: 0, confirm_gap: true });
    expect(payload.expected_periods).toEqual(billingPeriodSnapshot([period]));
    expect(payload.expected_rates).toHaveLength(2);
    expect(continuationPayload(period, [period], rates, { ...input, end: input.start }, false).period_end).toBe('2026-01-02');
  });
});
