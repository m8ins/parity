import { describe, expect, it } from 'vitest';
import { calculateProjection } from './calculations';
import { understandingFixture } from './understanding-fixture';
import type { Contract, Rate, Reading } from './types';

const fixture = understandingFixture();
const meter = fixture.meter;
const contract: Contract = { ...fixture.data.contracts[0], period_start: '2025-01-01', period_end: '2026-01-01' };
const rate: Rate = { ...fixture.data.ratesByContract['period-current'][0], effective_from: contract.period_start };
const samples = (values: [string, number][]): Reading[] => values.map(([date, value]) => ({ id: date, meter_id: meter.id, date, value, created_at: '' }));
const year = samples([['2025-01-01', 1000], ['2026-01-01', 4650]]);
describe('period calculations against independent arithmetic', () => {
  it('uses a closing boundary reading and excludes readings outside either boundary', () => {
    const result = calculateProjection(meter, contract, samples([['2024-12-31', 0], ['2025-01-01', 1000], ['2026-01-01', 4650], ['2026-01-02', 99999]]), [rate])!;
    // 3650 kWh × 0.30 €/kWh + 12 × 10 €; 12 × 100 € payments.
    expect(result.projectedYearlyConsumption).toBeCloseTo(3650, 8);
    expect(result.projectedYearlyCost).toBeCloseTo(1215, 8);
    expect(result.currentYearlyPayment).toBeCloseTo(1200, 8);
    expect(result.difference).toBeCloseTo(-15, 8);
    expect(result.observedConsumption).toBeCloseTo(3650, 8);
    expect(result.chartData.at(-1)?.actual).toBeCloseTo(3650, 8);
    expect(result.monthlyBreakdown.at(-1)?.end).toBe('2026-01-01');
  });
  it('calculates a 30-day period, including partial months, without a yearly total or division by twelve', () => {
    const short = { ...contract, period_start: '2025-01-15', period_end: '2025-02-14' };
    const result = calculateProjection(meter, short, samples([['2025-01-15', 1000], ['2025-02-14', 1300]]), [rate])!;
    expect(result.projectedYearlyConsumption).toBeCloseTo(300, 8);
    expect(result.projectedYearlyCost).toBeCloseTo(90 + 120 * 30 / 365, 8);
    expect(result.currentYearlyPayment).toBeCloseTo(1200 * 30 / 365, 8);
    expect(result.recommendedMonthlyPayment).toBeCloseTo((90 + 120 * 30 / 365) / (12 * 30 / 365), 8);
    expect(result.monthlyBreakdown.map(m => m.consumption)).toEqual([170, 130]);
    expect(result.monthlyBreakdown.reduce((s, m) => s + m.cost!, 0)).toBeCloseTo(90 + 120 * 30 / 365, 8);
  });
  it('splits prices and dated payment changes within a calendar month', () => {
    const period = { ...contract, period_end: '2025-02-01' };
    const readings = samples([['2025-01-01', 0], ['2025-02-01', 310]]);
    const changed = { ...rate, effective_from: '2025-01-16', arbeitspreis: 40, grundpreis: 20, abschlag: 200 };
    const result = calculateProjection(meter, period, readings, [rate, changed])!;
    // First 15 days: 150 kWh at 30ct; next 16: 160 kWh at 40ct.
    const expected = 45 + 64 + (10 * 15 + 20 * 16) * 12 / 365;
    expect(result.projectedYearlyCost).toBeCloseTo(expected, 8);
    expect(result.monthlyBreakdown[0].cost).toBeCloseTo(expected, 8);
    expect(result.currentYearlyPayment).toBeCloseTo((100 * 15 + 200 * 16) * 12 / 365, 8);
  });
  it('keeps missing prices/payments unknown, does not backdate rates, and preserves explicit zero', () => {
    const absent = calculateProjection(meter, contract, year, [])!;
    expect(absent.projectedYearlyConsumption).toBeCloseTo(3650);
    expect(absent.projectedYearlyCost).toBeNull();
    expect(absent.currentYearlyPayment).toBeNull();
    expect(absent.difference).toBeNull();
    expect(absent.monthlyBreakdown[0].cost).toBeNull();
    expect(calculateProjection(meter, contract, year, [{ ...rate, effective_from: '2025-02-01' }])!.projectedYearlyCost).toBeNull();
    const zero = calculateProjection(meter, contract, year, [{ ...rate, grundpreis: 0, arbeitspreis: 0, abschlag: 0 }])!;
    expect(zero.projectedYearlyCost).toBe(0);
    expect(zero.currentYearlyPayment).toBe(0);
    expect(zero.difference).toBe(0);
    expect(zero.recommendedMonthlyPayment).toBe(0);
  });
  it('handles twelve months of gas, a price change after March and a positive refund comparison', () => {
    const gas = { ...meter, type: 'gas' as const };
    const readings = samples([['2025-01-01', 1000], ['2025-04-01', 1440], ['2026-01-01', 2000]]);
    const gasRate = { ...rate, arbeitspreis: 10, abschlag: 130, umrechnungsfaktor: 10 };
    const result = calculateProjection(gas, contract, readings, [gasRate, { ...gasRate, effective_from: '2025-04-01', arbeitspreis: 12 }])!;
    // Jan–Mar H0 share = .17+.15+.12=.44; remaining share .56.
    // 1000 m³ × 10 = 10,000 kWh, 4400*.10 + 5600*.12 + 120 = 1232.
    expect(result.projectedYearlyConsumption).toBeCloseTo(10000, 8);
    expect(result.projectedYearlyCost).toBeCloseTo(1232, 8);
    expect(result.currentYearlyPayment).toBeCloseTo(1560, 8);
    expect(result.difference).toBeCloseTo(328, 8);
    expect(result.observedConsumption).toBeCloseTo(10000, 8);
    expect(result.monthlyBreakdown).toHaveLength(12);
  });
  it('uses dated gas factors without applying the latest factor retroactively', () => {
    const gas = { ...meter, type: 'gas' as const };
    const period = { ...contract, period_end: '2025-01-03' };
    const readings = samples([['2025-01-01', 100], ['2025-01-03', 120]]);
    const first = { ...rate, umrechnungsfaktor: 10 };
    const result = calculateProjection(gas, period, readings, [first, { ...first, effective_from: '2025-01-02', umrechnungsfaktor: 12 }])!;
    expect(result.observedConsumption).toBeCloseTo(10 * 10 + 10 * 12, 8);
    expect(result.projectedYearlyConsumption).toBeCloseTo(220, 8);
    expect(result.monthlyBreakdown[0].consumption).toBeCloseTo(220, 8);
    expect(calculateProjection(gas, period, readings, [])).toBeNull();
    expect(calculateProjection(gas, period, readings, [{ ...first, umrechnungsfaktor: 0 }])).toBeNull();
  });
  it('retains seasonal and individual monthly weights', () => {
    const jan = samples([['2025-01-01', 0], ['2025-02-01', 170]]);
    const gas = { ...meter, type: 'gas' as const };
    expect(calculateProjection(gas, contract, jan, [rate])!.projectedYearlyConsumption).toBeCloseTo(1000, 8);
    expect(calculateProjection({ ...gas, monthly_distribution: Array(12).fill(1 / 12) }, contract, jan, [rate])!.projectedYearlyConsumption).toBeCloseTo(2040, 8);
  });
  it('does not invent baselines or bridge from other periods and rejects falling/duplicate readings', () => {
    const middle = samples([['2024-12-31', 0], ['2025-02-01', 100], ['2025-03-01', 380], ['2026-01-02', 10000]]);
    const result = calculateProjection(meter, contract, middle, [rate])!;
    expect(result.observedConsumption).toBeCloseTo(280);
    expect(result.chartData.every(p => p.actual === null)).toBe(true);
    expect(result.monthlyBreakdown).toHaveLength(1);
    expect(calculateProjection(meter, contract, [], [rate])).toBeNull();
    expect(calculateProjection(meter, contract, year.slice(0, 1), [rate])).toBeNull();
    expect(calculateProjection(meter, contract, samples([['2025-01-01', 100], ['2025-01-02', 99]]), [rate])).toBeNull();
    expect(calculateProjection(meter, contract, samples([['2025-01-01', 100], ['2025-01-01', 100]]), [rate])).toBeNull();
  });
});
