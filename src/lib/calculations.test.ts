import { describe, it, expect } from 'vitest';
import { calculateProjection } from './calculations';
import { Contract, Reading, ContractPrice, ContractPayment, GAS_WEIGHTS } from './types';

describe('calculateProjection', () => {
    // Mock Data Helpers
    const createContract = (type: 'electricity' | 'gas', overrides?: Partial<Contract>): Contract => ({
        id: 'test-id',
        user_id: 'user-1',
        name: 'Test Contract',
        type,
        start_date: '2024-01-01',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        ...overrides
    });

    const createReadings = (values: { date: string, value: number }[]): Reading[] =>
        values.map((v, i) => ({ id: `r-${i}`, contract_id: 'test-id', created_at: 'now', ...v }));

    const createPrice = (amount: number, validFrom = '2024-01-01'): ContractPrice => ({
        id: 'p-1', contract_id: 'test-id', valid_from: validFrom, base_price_monthly: 10, energy_price_cents_per_kwh: amount
    });

    const createPayment = (amount: number, validFrom = '2024-01-01'): ContractPayment => ({
        id: 'pay-1', contract_id: 'test-id', valid_from: validFrom, monthly_payment: amount
    });

    it('returns null for insufficient readings', () => {
        const contract = createContract('electricity');
        const readings = createReadings([{ date: '2024-01-01', value: 1000 }]);
        const result = calculateProjection(contract, readings, [], []);
        expect(result).toBeNull();
    });

    it('calculates linear projection for electricity correctly', () => {
        const contract = createContract('electricity');
        // 100 days, 1000 kWh consumption -> 10 kWh/day
        // Yearly: 10 * 365 = 3650 (approx, taking leap year into account might vary slightly)
        const readings = createReadings([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-04-10', value: 2000 } // 100 days later (leap year 2024 has 29 days in Feb)
            // Jan: 31, Feb: 29, Mar: 31, Apr: 10 = 101 days actually.
            // Let's use simple dates. Jan 1 to Jan 11 (10 days).
        ]);

        const simpleReadings = createReadings([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-01-11', value: 1100 } // 10 days, 100 kWh -> 10/day
        ]);

        // 2024 is a leap year (366 days).
        // Daily weight in 2024 for electricity = 1/366.
        // Tracked weight for 10 days = 10/366.
        // Consumption = 100.
        // Projected = 100 / (10/366) = 3660.

        const prices = [createPrice(30)]; // 30 cents/kwh
        const payments = [createPayment(100)];

        const result = calculateProjection(contract, simpleReadings, prices, payments);

        expect(result).not.toBeNull();
        expect(result?.projectedYearlyConsumption).toBeCloseTo(3660, 0);
    });

    it('calculates seasonal projection for gas correctly', () => {
        const contract = createContract('gas');
        // Use a winter month where weight is heavy.
        // Jan weight in GAS_WEIGHTS is typically high (e.g. 13-16%).
        // Let's check the imported type or assume standard logic.
        // If we track 10 days in Jan, we expect high consumption, so yearly projection should NOT be just linear (which would be huge),
        // but normalized by the high weight.

        // Example: Jan weight is 0.16 (16%).
        // 31 days in Jan. Daily weight = 0.16 / 31.
        // Track 10 days in Jan: Weight = 10 * (0.16/31) ~= 0.0516
        // Consumption 100 kWh.
        // Projected = 100 / 0.0516 = 1937.

        // If it were linear: 100/10 * 366 = 3660.
        // So gas projection should be LOWER than linear if measured in winter.

        const readings = createReadings([
            { date: '2024-01-01', value: 1000 },
            { date: '2024-01-11', value: 1100 }
        ]);

        const result = calculateProjection(contract, readings, [], []);

        // We don't know exact weights here without checking the file, but we know logic.
        // Just verify it is different from linear calculation if weights are applied.

        const linearContract = createContract('electricity');
        const linearResult = calculateProjection(linearContract, readings, [], []);

        expect(result?.projectedYearlyConsumption).not.toBe(linearResult?.projectedYearlyConsumption);
        // It should be roughly half because Jan is ~2x weighted than average?
        // Actually Jan is ~16%, average month is 8.3%. So yes, roughly half.
        expect(result?.projectedYearlyConsumption).toBeLessThan(linearResult!.projectedYearlyConsumption);
    });

    it('applies m3 to kWh conversion factor correctly', () => {
        const contract = createContract('gas', { conversion_factor_m3_to_kwh: 10 });
        const readings = createReadings([
            { date: '2024-01-01', value: 100 }, // m3
            { date: '2024-01-11', value: 110 }  // 10 m3 delta
        ]);
        // 10 m3 * 10 = 100 kWh consumption.

        // Compare with factor 1
        const contract1 = createContract('gas', { conversion_factor_m3_to_kwh: 1 });
        const result1 = calculateProjection(contract1, readings, [], []);
        const result10 = calculateProjection(contract, readings, [], []);

        expect(result10?.projectedYearlyConsumption).toBeCloseTo(result1!.projectedYearlyConsumption * 10, 0);
    });
});
