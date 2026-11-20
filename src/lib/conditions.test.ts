import { describe, expect, it } from 'vitest';
import { activeRate, calculateProjection } from './calculations';
import { conditionErrors, conditionPayload, conditionRange, conditionValues, deletionEffect } from './conditions';
import { understandingFixture } from './understanding-fixture';
const { meter, data } = understandingFixture();
const contract = { ...data.contracts[0], period_start: '2025-01-01', period_end: '2025-02-01' };
const first = { ...data.ratesByContract['period-current'][0], id: 'first', effective_from: '2025-01-01' };
const later = { ...first, id: 'later', effective_from: '2025-01-25', arbeitspreis: 50, abschlag: 200 };
const rates = [first, later];
describe('dated condition changes', () => {
  it.each(['grundpreis', 'arbeitspreis', 'abschlag'] as const)('changes only %s and carries the date-specific baseline', key => {
    const baseline = activeRate(rates, '2025-01-16');
    const values = { ...conditionValues(baseline), [key]: '0' };
    const payload = conditionPayload(contract, rates, 'create', '2025-01-16', values, false);
    expect(payload[key]).toBe(0);
    for (const other of ['grundpreis', 'arbeitspreis', 'abschlag'] as const) if (other !== key) expect(payload[other]).toBe(first[other]);
    expect(activeRate(rates, '2025-01-26')).toEqual(later);
  });
  it('accepts German grouping and gas precision without silently treating blanks as zero', () => {
    const values = { grundpreis: '1.234,56789', arbeitspreis: '12,34567', abschlag: '0', umrechnungsfaktor: '10,71234567' };
    expect(conditionErrors(contract, [], '2025-01-16', values, true, 'create')).toEqual({});
    expect(conditionPayload(contract, [], 'create', '2025-01-16', values, true)).toMatchObject({ grundpreis: 1234.56789, arbeitspreis: 12.34567, abschlag: 0, umrechnungsfaktor: 10.71234567 });
    expect(conditionErrors(contract, [], '2025-01-16', { ...values, abschlag: '' }, true, 'create')).toHaveProperty('abschlag');
    expect(conditionErrors(contract, [], '2025-01-16', { ...values, arbeitspreis: '12.34' }, true, 'create')).toHaveProperty('arbeitspreis');
  });
  it.each([['2024-12-31', true], ['2025-01-01', false], ['2025-01-31', false], ['2025-02-01', true], ['2025-02-02', true], ['2025-02-30', true]])('checks start-inclusive/end-exclusive date %s', (date, invalid) => {
    expect(Boolean(conditionErrors(contract, [], date, conditionValues(first), false, 'create').date)).toBe(invalid);
  });
  it('allows known future conditions, explicit corrections and historical periods', () => {
    expect(conditionErrors({ ...contract, settlement_amount: 328 }, rates, '2025-01-16', conditionValues(first), false, 'create')).toEqual({});
    expect(conditionErrors(contract, rates, first.effective_from, conditionValues(first), false, 'create')).toHaveProperty('date');
    expect(conditionErrors(contract, rates, first.effective_from, conditionValues(first), false, 'correct')).toEqual({});
    expect(conditionErrors({ ...contract, period_end: '2030-01-01' }, rates, '2029-12-01', conditionValues(first), false, 'create')).toEqual({});
  });
  it('does not guess between duplicate dates, independent of array order', () => {
    const duplicate = { ...first, id: 'duplicate', arbeitspreis: 99 };
    expect(activeRate([first, duplicate, later], first.effective_from)).toBeUndefined();
    expect(activeRate([duplicate, first, later], first.effective_from)).toBeUndefined();
    expect(activeRate([duplicate, first, later], later.effective_from)).toEqual(later);
  });
  it('explains deletion with a predecessor or a real gap', () => {
    expect(deletionEffect(rates, later).predecessor).toEqual(first);
    expect(deletionEffect(rates, first)).toEqual({ predecessor: undefined, next: later });
  });
  it('bounds the impact of legacy conditions before or after the selected period', () => {
    expect(conditionRange(contract, rates, '2024-12-01')).toBeNull();
    expect(conditionRange(contract, [], '2024-12-01')).toEqual({ start: '2025-01-01', end: '2025-02-01' });
    expect(conditionRange(contract, [], '2025-02-01')).toBeNull();
    expect(conditionRange(contract, [], '2025-03-01')).toBeNull();
  });
  it('splits backdated and later prices with fixed independent 15/9/7 day expectations', () => {
    const middle = { ...first, id: 'middle', effective_from: '2025-01-16', grundpreis: 20, arbeitspreis: 40, abschlag: 150 };
    const readings = [{ id: 'a', meter_id: meter.id, date: '2025-01-01', value: 0, created_at: '' }, { id: 'b', meter_id: meter.id, date: '2025-02-01', value: 310, created_at: '' }];
    const result = calculateProjection(meter, contract, readings, [later, middle, first])!;
    // 10kWh per day: 15*.30 + 9*.40 + 7*.50, then daily base proration.
    const expected = 45 + 36 + 35 + (15 * 10 + 9 * 20 + 7 * 10) * 12 / 365;
    expect(result.projectedYearlyCost).toBeCloseTo(expected, 8);
    expect(result.currentYearlyPayment).toBeCloseTo((15 * 100 + 9 * 150 + 7 * 200) * 12 / 365, 8);
    expect(result.monthlyBreakdown[0].cost).toBeCloseTo(expected, 8);
    expect(calculateProjection(meter, contract, readings, [later])!.projectedYearlyCost).toBeNull();
  });
});
