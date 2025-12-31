import { Contract, Reading, ContractPrice, ContractPayment, GAS_WEIGHTS, ELECTRICITY_WEIGHTS } from './types';

export interface ProjectionResult {
    projectedYearlyConsumption: number; // kWh
    projectedYearlyCost: number; // Euro
    currentYearlyPayment: number; // Euro (Sum of payments over the year)
    difference: number; // Euro
    recommendedMonthlyPayment: number; // Euro
    daysTracked: number;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
}

export function calculateProjection(
    contract: Contract,
    readings: Reading[],
    prices: ContractPrice[],
    payments: ContractPayment[]
): ProjectionResult | null {
    if (!readings || readings.length < 2) {
        return null;
    }

    // Sort Data
    const sortedReadings = [...readings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const sortedPrices = [...prices].sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime());
    const sortedPayments = [...payments].sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime());

    // 1. Calculate Consumption Projection (unchanged logic mostly)
    const firstReading = sortedReadings[0];
    const lastReading = sortedReadings[sortedReadings.length - 1];

    // Apply conversion factor. 
    // If undefined (old client code?), default to 1 (electricity behavior) or 10 if gas? 
    // Safest is to check contract type or rely on the field being present.
    // Given DB default is 1, let's use that.
    const factor = contract.conversion_factor_m3_to_kwh ?? 10;
    const consumption = (lastReading.value - firstReading.value) * factor;

    const startDate = new Date(firstReading.date);
    const endDate = new Date(lastReading.date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const daysTracked = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysTracked <= 0) return null;

    let projectedYearlyConsumption = 0;

    // Determine Tracking Weight (how much of the year did we cover?)
    let trackedWeight = 0;

    // Helper to get day weight
    const getDayWeight = (date: Date) => {
        if (contract.monthly_distribution && contract.monthly_distribution.length === 12) {
            const month = date.getMonth();
            const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
            return contract.monthly_distribution[month] / daysInMonth;
        }

        if (contract.type === 'electricity') {
            return 1 / (365 + (isLeapYear(date.getFullYear()) ? 1 : 0));
        } else {
            const month = date.getMonth();
            const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
            return GAS_WEIGHTS[month] / daysInMonth;
        }
    };

    let loopDate = new Date(startDate);
    while (loopDate < endDate) {
        trackedWeight += getDayWeight(loopDate);
        loopDate.setDate(loopDate.getDate() + 1);
    }

    if (trackedWeight <= 0) trackedWeight = 0.0001;
    projectedYearlyConsumption = consumption / trackedWeight;


    // 2. Determine Current Billing Period
    // Find the contract start anniversary that is current
    const contractStart = new Date(contract.start_date);
    const now = new Date();

    let billingYearStart = new Date(contractStart);
    // Advance billing start until it covers 'now' (or most recent relevant period)
    // Simple logic: Start date is in the past. 
    // If Start 2023-01-01, Now 2025-05-01. Cycles: 23-24, 24-25, 25-26. 
    // We want the cycle containing Now.
    while (true) {
        const nextYear = new Date(billingYearStart);
        nextYear.setFullYear(billingYearStart.getFullYear() + 1);
        if (now < nextYear) break;
        billingYearStart = nextYear;
    }

    const billingYearEnd = new Date(billingYearStart);
    billingYearEnd.setFullYear(billingYearStart.getFullYear() + 1);

    // 3. Time-Slice Cost Calculation over the Billing Year
    let projectedYearlyCost = 0;
    let expectedYearlyPayment = 0;

    let calcDate = new Date(billingYearStart);

    // Optimize: Convert arrays to efficient lookups or just find logic
    // Given the number of prices implies < 100 usually, simple find is fine.

    const findActiveItem = <T extends { valid_from: string }>(items: T[], date: Date): T | null => {
        // Items sorted asc. Find the last item where valid_from <= date
        // Iterate backwards
        for (let i = items.length - 1; i >= 0; i--) {
            if (new Date(items[i].valid_from) <= date) {
                return items[i];
            }
        }
        return items[0] ?? null; // Fallback to first if available (or null)
    };

    while (calcDate < billingYearEnd) {
        const activePrice = findActiveItem(sortedPrices, calcDate);
        const activePayment = findActiveItem(sortedPayments, calcDate);

        const dayWeight = getDayWeight(calcDate);
        // Daily Consumption for cost mapping
        const dailyConsumption = projectedYearlyConsumption * dayWeight;

        if (activePrice) {
            // Base Price is Monthly. Daily = Monthly * 12 / DaysInYear
            const year = calcDate.getFullYear();
            const daysInYear = 365 + (isLeapYear(year) ? 1 : 0);
            const dailyBasePrice = (activePrice.base_price_monthly * 12) / daysInYear;

            const dailyEnergyCost = (dailyConsumption * activePrice.energy_price_cents_per_kwh) / 100;

            projectedYearlyCost += dailyBasePrice + dailyEnergyCost;
        }

        if (activePayment) {
            const year = calcDate.getFullYear();
            const daysInYear = 365 + (isLeapYear(year) ? 1 : 0);
            const dailyPayment = (activePayment.monthly_payment * 12) / daysInYear;
            expectedYearlyPayment += dailyPayment;
        }

        calcDate.setDate(calcDate.getDate() + 1);
    }

    const difference = expectedYearlyPayment - projectedYearlyCost;
    const recommendedMonthlyPayment = projectedYearlyCost / 12; // Average needed

    return {
        projectedYearlyConsumption,
        projectedYearlyCost,
        currentYearlyPayment: expectedYearlyPayment,
        difference,
        recommendedMonthlyPayment,
        daysTracked,
        billingPeriodStart: billingYearStart,
        billingPeriodEnd: billingYearEnd
    };
}

function isLeapYear(year: number) {
    return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
}
