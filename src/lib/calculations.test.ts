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

  it('scopes the run-rate to the billing period for multi-year readings', () => {
    // A meter with readings spanning two contract years. The 2024 projection
    // must ignore the 2025 reading, so it equals the projection computed from
    // the 2024 readings alone.
    const meter = createMeter('electricity');
    const contract2024 = createContract('meter-1', {
      period_start: '2024-01-01',
      period_end: '2025-01-01',
    });
    const within2024 = [
      { date: '2024-01-01', value: 0 },
      { date: '2024-07-01', value: 1000 },
    ];
    const rates = [createRate(30)];

    const scoped = calculateProjection(
      meter,
      contract2024,
      createReadings([...within2024, { date: '2025-07-01', value: 9000 }]),
      rates,
    );
    const isolated = calculateProjection(
      meter,
      contract2024,
      createReadings(within2024),
      rates,
    );

    expect(scoped?.projectedYearlyConsumption).toBeCloseTo(
      isolated!.projectedYearlyConsumption,
      5,
    );
  });

  it('difference sign follows the settlement convention', () => {
    const meter = createMeter('electricity');
    const contract = createContract();
    const readings = createReadings([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-11', value: 1100 },
    ]);

    // High abschlag → overpaid → positive difference (Erstattung).
    const overpaid = calculateProjection(meter, contract, readings, [
      createRate(30, { abschlag: 1000 }),
    ]);
    expect(overpaid?.difference).toBeGreaterThan(0);

    // Tiny abschlag → underpaid → negative difference (Nachzahlung).
    const underpaid = calculateProjection(meter, contract, readings, [
      createRate(30, { abschlag: 1 }),
    ]);
    expect(underpaid?.difference).toBeLessThan(0);
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
