import { describe, expect, it } from 'vitest';
import { exclusiveEnd, inclusiveEnd, periodIsFinished, validPeriodEnd } from './billing-period';
import { conditionErrors, conditionRange, conditionValues } from './conditions';
import { understandingFixture } from './understanding-fixture';
const fixture = understandingFixture();
const open = { ...fixture.data.contracts[0], period_start: '2025-11-01', period_end: undefined };
const rate = fixture.data.ratesByContract['period-current'][0];
describe('open billing periods and inclusive UI dates', () => {
  it('does not finish an open period at the calculation horizon or later', () => {
    expect(periodIsFinished(open, '2026-11-16')).toBe(false);
    expect(periodIsFinished(open, '2030-01-01')).toBe(false);
    expect(periodIsFinished({ ...open, period_end: '2026-11-01' }, '2026-11-16')).toBe(true);
  });
  it('permits new dated conditions beyond a year without changing closed-period boundaries', () => {
    expect(conditionErrors(open, [], '2026-12-01', conditionValues(rate), true, 'create')).toEqual({});
    expect(conditionErrors(open, [], '2030-12-01', conditionValues(rate), true, 'create')).toEqual({});
    expect(conditionErrors({ ...open, period_end: '2026-11-01' }, [], '2026-11-01', conditionValues(rate), true, 'create')).toHaveProperty('date');
    expect(conditionErrors(open, [], '2025-10-31', conditionValues(rate), true, 'create')).toHaveProperty('date');
    expect(conditionRange(open, [], '2026-12-01')).toEqual({ start: '2026-12-01', end: undefined });
  });
  it('converts inclusive end days without DST or leap-year drift and preserves an empty end', () => {
    expect(inclusiveEnd(open)).toBe(''); expect(exclusiveEnd('')).toBeNull();
    expect(exclusiveEnd('2026-10-31')).toBe('2026-11-01');
    expect(inclusiveEnd({ ...open, period_end: '2026-11-01' })).toBe('2026-10-31');
    expect(exclusiveEnd('2024-02-29')).toBe('2024-03-01');
    expect(validPeriodEnd('2026-02-30', open.period_start)).toBe(false);
    expect(validPeriodEnd('2025-10-31', open.period_start)).toBe(false);
    expect(validPeriodEnd('2025-11-01', open.period_start)).toBe(true);
  });
});
