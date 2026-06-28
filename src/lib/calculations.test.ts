import { describe, it, expect, vi } from 'vitest';
import { calculateProjection } from './calculations';
import { Meter, Contract, Reading, Rate, GAS_WEIGHTS } from './types';

describe('calculateProjection', () => {
  const createMeter = (
    type: 'electricity' | 'gas',
    overrides?: Partial<Meter>,
  ): Meter => ({
    id: 'meter-1',
    user_id: 'user-1',
    name: 'Test Meter',
    type,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  });

  const createContract = (
    meterId = 'meter-1',
    overrides?: Partial<Contract>,
  ): Contract => ({
    id: 'contract-1',
    meter_id: meterId,
    period_start: '2024-01-01',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  });

  const createReadings = (
    values: { date: string; value: number }[],
  ): Reading[] =>
    values.map((v, i) => ({
      id: `r-${i}`,
      meter_id: 'meter-1',
      created_at: 'now',
      ...v,
    }));

  const createRate = (
    energyPrice: number,
    overrides?: Partial<Rate>,
  ): Rate => ({
    id: 'rate-1',
    contract_id: 'contract-1',
    effective_from: '2024-01-01',
    grundpreis: 10,
    arbeitspreis: energyPrice,
    abschlag: 100,
    umrechnungsfaktor: 1,
    created_at: '2024-01-01',
    ...overrides,
  });

  it('returns null for insufficient readings', () => {
    const meter = createMeter('electricity');
    const contract = createContract();
    const readings = createReadings([{ date: '2024-01-01', value: 1000 }]);
    const result = calculateProjection(meter, contract, readings, []);
    expect(result).toBeNull();
  });

  it('calculates linear projection for electricity correctly', () => {
    const meter = createMeter('electricity');
    const contract = createContract();
    // 10 days, 100 kWh → 10 kWh/day
    // 2024 is a leap year (366 days). Projected = 100 / (10/366) = 3660.
    const readings = createReadings([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-11', value: 1100 },
    ]);

    const rates = [createRate(30)];
    const result = calculateProjection(meter, contract, readings, rates);

    expect(result).not.toBeNull();
    expect(result?.projectedYearlyConsumption).toBeCloseTo(3660, 0);
  });

  it('calculates seasonal projection for gas correctly', () => {
    // Gas in winter (Jan) should project LOWER than linear because Jan is heavily weighted.
    // Use umrechnungsfaktor=1 to test pure seasonal distribution, not conversion.
    const meter = createMeter('gas');
    const contract = createContract();
    const readings = createReadings([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-11', value: 1100 },
    ]);
    const rates = [createRate(9.33, { umrechnungsfaktor: 1 })];

    const result = calculateProjection(meter, contract, readings, rates);

    const elecMeter = createMeter('electricity');
    const linearResult = calculateProjection(elecMeter, contract, readings, []);

    expect(result?.projectedYearlyConsumption).not.toBe(
      linearResult?.projectedYearlyConsumption,
    );
    // Jan is ~2x average weight, so gas projection should be roughly half of linear
    expect(result?.projectedYearlyConsumption).toBeLessThan(
      linearResult!.projectedYearlyConsumption,
    );
  });

  it('applies umrechnungsfaktor correctly', () => {
    const meter10 = createMeter('gas');
    const meter1 = createMeter('gas');
    const contract = createContract();
    const readings = createReadings([
      { date: '2024-01-01', value: 100 },
      { date: '2024-01-11', value: 110 },
    ]);

    const rates10 = [createRate(9.33, { umrechnungsfaktor: 10 })];
    const rates1 = [createRate(9.33, { umrechnungsfaktor: 1 })];

    const result10 = calculateProjection(meter10, contract, readings, rates10);
    const result1 = calculateProjection(meter1, contract, readings, rates1);

    expect(result10?.projectedYearlyConsumption).toBeCloseTo(
      result1!.projectedYearlyConsumption * 10,
      0,
    );
  });

  it('generates chart data correctly', () => {
    const date = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(date);

    const meter = createMeter('electricity');
    const contract = createContract();
    const readings = createReadings([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-02-01', value: 1310 }, // 31 days * 10 = 310
    ]);
    const result = calculateProjection(meter, contract, readings, []);

    expect(result?.chartData).toBeDefined();
    expect(result?.chartData.length).toBeGreaterThanOrEqual(12);

    const firstPoint = result!.chartData[0];
    expect(new Date(firstPoint.date).toISOString()).toBe(
      new Date('2024-01-01T00:00:00.000Z').toISOString(),
    );
    expect(firstPoint.projected).toBe(0);
    expect(firstPoint.actual).toBe(0);

    const secondPoint = result!.chartData[1];
    expect(secondPoint.projected).toBeGreaterThan(300);
    expect(secondPoint.projected).toBeLessThan(320);
    expect(secondPoint.actual).toBeCloseTo(310, 0);

    vi.useRealTimers();
  });

  it('adds a chart point at each real reading date (mid-month)', () => {
    const date = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(date);

    const meter = createMeter('electricity');
    const contract = createContract();
    const readings = createReadings([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-02-15', value: 1450 }, // mid-month reading
    ]);
    const result = calculateProjection(meter, contract, readings, []);

    const midPoint = result!.chartData.find(
      (p) =>
        new Date(p.date).toISOString() ===
        new Date('2024-02-15T00:00:00.000Z').toISOString(),
    );

    expect(midPoint).toBeDefined();
    // actual = (1450 - 1000) * factor(1) = 450
    expect(midPoint!.actual).toBeCloseTo(450, 0);

    vi.useRealTimers();
  });

  it('includes the current partial month in monthlyBreakdown', () => {
    const meter = createMeter('electricity');
    const contract = createContract();
    // Last reading is mid-month -> the partial month must show up.
    const readings = createReadings([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-02-01', value: 1100 },
      { date: '2024-02-15', value: 1170 },
    ]);
    const rate = createRate(30, { grundpreis: 10 });

    const result = calculateProjection(meter, contract, readings, [rate]);

    const feb = result!.monthlyBreakdown.find(
      (m) => new Date(m.month).getMonth() === 1, // February
    );

    expect(feb).toBeDefined();
    // Feb 1 -> Feb 15 = 1170 - 1100 = 70
    expect(feb!.consumption).toBeCloseTo(70, 0);
  });

  it('calculates monthlyBreakdown correctly', () => {
    const meter = createMeter('electricity');
    const contract = createContract();
    const readings = createReadings([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-02-01', value: 1100 },
      { date: '2024-03-01', value: 1200 },
    ]);
    const rate = createRate(30, { grundpreis: 10 });

    const result = calculateProjection(meter, contract, readings, [rate]);

    expect(result?.monthlyBreakdown).toHaveLength(2);
    expect(result?.monthlyBreakdown[0].consumption).toBeCloseTo(100);
  });
});
