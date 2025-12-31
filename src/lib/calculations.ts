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

    chartData: ChartDataPoint[];
    paidUsage: number; // kWh
}

export interface ChartDataPoint {
    date: string; // ISO String
    projected: number; // Cumulative kWh
    actual: number | null; // Cumulative kWh
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

    // If undefined (old client code?), default to 1 (electricity behavior) or 10 if gas? 
    // Safest is to check contract type or rely on the field being present.
    // Given DB default is 1, let's use that.
    let factor = 1;
    if (contract.type === 'gas') {
        factor = contract.conversion_factor_m3_to_kwh ?? 10;
    }
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

    // Accumulators for goal calculation
    let totalBasePrice = 0;
    let totalWeightedEnergyPrice = 0; // Sum of (Price/100 * Weight)

    // Chart Data Prep
    const chartData: ChartDataPoint[] = [];
    let accumulatedProjectedConsumption = 0;
    // Helper for interpolation
    const sortedReadingsByTime = [...sortedReadings].map(r => ({ ...r, time: new Date(r.date).getTime() }));

    const estimateReading = (targetDate: Date): number | null => {
        const time = targetDate.getTime();
        // If before first reading or after last reading, we might not want to show data, 
        // to avoid misleading "flat" lines or wild extrapolations.
        // However, if we are 'inside' the range of readings, we interpolate.

        if (time < sortedReadingsByTime[0].time || time > sortedReadingsByTime[sortedReadingsByTime.length - 1].time) {
            // Check if it's "close enough" (same day)?
            // For now return null ensures we don't plot lines where we don't have data.
            return null;
        }

        // Find surrounding readings
        const afterIndex = sortedReadingsByTime.findIndex(r => r.time >= time);
        if (afterIndex === -1) return null; // Should not happen given check above

        const after = sortedReadingsByTime[afterIndex];
        if (after.time === time) return after.value;

        if (afterIndex === 0) return after.value; // First reading matches or is after (handled by < check)

        const before = sortedReadingsByTime[afterIndex - 1];

        const span = after.time - before.time;
        const progress = (time - before.time) / span;
        return before.value + (after.value - before.value) * progress;
    };

    // Calculate baseline (reading at start of billing period).
    // If billing start is before first reading, we can't properly zero-base "Actual".
    // Fallback: If billing start is BEFORE first reading, we might shift the graph?
    // User wants "Projected usage vs Actual usage".
    // If we have readings from Jan to Mar, and Billing Start is Jan 1.
    // Baseline = Reading(Jan 1).
    // If Billing Start is Jan 1, but first reading is Feb 1. We don't know Jan 1 reading.
    // In that case, we can't plot "Actual" starting at 0 on Jan 1.
    // We can only plot Actual from Feb 1 onwards.
    // But the chart needs to show the Billing Period.
    // Let's rely on estimateReading returning null.

    // We need a baseline to subtract from future readings to show "Usage since start of period".
    // If estimating at Start returns null, we can try to use the first available reading as a reference, 
    // but that complicates the "cumulative" nature.
    // Simplification: We only plot actual points where we have data, adjusted by the estimated reading at Start.
    // If estimated reading at Start is null, we can't anchor the "Actual" line to 0 at the start.
    // In that case, maybe we don't return Actual data? Or we treat the first available reading as the anchor?
    // Let's try to estimate baseline. If null, use nearest?
    let baselineReading = estimateReading(billingYearStart);
    // If we can't estimate start (e.g. data starts later), we might need to extrapolate backwards 
    // OR just accept nulls.
    // If we assume linear consumption backwards for the sake of the baseline?
    // Let's stick to strict interpolation. If null, we just don't have an "Actual" curve starting at 0.
    // But wait, if we have data later, we want to see it.
    // If Contract started 2020. We have readings 2024. Billing Period 2024.
    // Then estimateReading(2024-Start) should work because we likely have readings bounding it or close to it.
    // If it's a new contract starting today, and no readings yet. No chart.
    if (baselineReading === null && sortedReadings.length > 0) {
        // Try to extrapolate if the gap is small? 
        // Or just use the first reading relative to its date?
        // Let's leave it null. The chart will just show points where we have data relative to... wait.
        // If baseline is null, we don't know "Usage SINCE start".
        // Example: Start Jan 1. First Reading Feb 1 = 1000.
        // Did they use 1000 since Jan 1? Or was Jan 1 = 900?
        // We don't know.
        // So Actual line is empty?
        // That seems fair. 
    }

    let nextChartPointDate = new Date(billingYearStart);
    // Push initial point (Start)
    chartData.push({
        date: billingYearStart.toISOString(),
        projected: 0,
        actual: baselineReading !== null ? 0 : null
    });
    // Set next target to +1 month
    nextChartPointDate.setMonth(nextChartPointDate.getMonth() + 1);

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
        // ... Logic for cost ...
        const activePrice = findActiveItem(sortedPrices, calcDate);
        const activePayment = findActiveItem(sortedPayments, calcDate);

        const dayWeight = getDayWeight(calcDate);
        // Daily Consumption for cost mapping
        const dailyConsumption = projectedYearlyConsumption * dayWeight;

        // Accumulate for Chart (Projected)
        accumulatedProjectedConsumption += dailyConsumption;

        // Check if we reached a chart point (Month boundary)
        // We check if calcDate is close to nextChartPointDate
        // Since we iterate daily, we will hit it.
        // Note: nextChartPointDate might skip days if we are not careful (Feb 28 vs 30).
        // Let's use strict date comparison: if calcDate >= nextChartPointDate
        if (calcDate.getTime() >= nextChartPointDate.getTime()) {
            // Push point
            const val = estimateReading(calcDate);
            const actual = (val !== null && baselineReading !== null)
                ? (val - baselineReading) * factor
                : null;

            chartData.push({
                date: calcDate.toISOString(),
                projected: accumulatedProjectedConsumption,
                actual: actual
            });

            // Update next target
            nextChartPointDate.setMonth(nextChartPointDate.getMonth() + 1);
        }

        if (activePrice) {
            // Base Price is Monthly. Daily = Monthly * 12 / DaysInYear
            const year = calcDate.getFullYear();
            const daysInYear = 365 + (isLeapYear(year) ? 1 : 0);
            const dailyBasePrice = (activePrice.base_price_monthly * 12) / daysInYear;
            const dailyEnergyCost = (dailyConsumption * activePrice.energy_price_cents_per_kwh) / 100;

            projectedYearlyCost += dailyBasePrice + dailyEnergyCost;

            totalBasePrice += dailyBasePrice;
            totalWeightedEnergyPrice += (activePrice.energy_price_cents_per_kwh / 100) * dayWeight;
        }

        if (activePayment) {
            const year = calcDate.getFullYear();
            const daysInYear = 365 + (isLeapYear(year) ? 1 : 0);
            const dailyPayment = (activePayment.monthly_payment * 12) / daysInYear;
            expectedYearlyPayment += dailyPayment;
        }

        calcDate.setDate(calcDate.getDate() + 1);
    }

    // Ensure we capture the final point if missed (e.g. End Date)
    // The loop runs WHILE calcDate < billingYearEnd.
    // So distinct end point (billingYearEnd) is not processed inside loop.
    // We should add it.
    {
        const val = estimateReading(billingYearEnd);
        const actual = (val !== null && baselineReading !== null)
            ? (val - baselineReading) * factor
            : null;

        // If we haven't just pushed it (very close check)
        const lastPt = chartData[chartData.length - 1];
        if (new Date(lastPt.date).getTime() < billingYearEnd.getTime()) {
            chartData.push({
                date: billingYearEnd.toISOString(),
                projected: accumulatedProjectedConsumption, // Should be roughly projectedYearlyConsumption
                actual: actual
            });
        }
    }

    const difference = expectedYearlyPayment - projectedYearlyCost;
    const recommendedMonthlyPayment = projectedYearlyCost / 12; // Average needed

    // Calculate Paid Usage (Goal)
    // Formula: TotalPayment = TotalBase + (PaidUsage * WeightedPriceFactor)
    // PaidUsage = (TotalPayment - TotalBase) / WeightedPriceFactor
    let paidUsage = 0;
    if (totalWeightedEnergyPrice > 0) {
        paidUsage = (expectedYearlyPayment - totalBasePrice) / totalWeightedEnergyPrice;
    }

    return {
        projectedYearlyConsumption,
        projectedYearlyCost,
        currentYearlyPayment: expectedYearlyPayment,
        difference,
        recommendedMonthlyPayment,
        paidUsage,
        daysTracked,
        billingPeriodStart: billingYearStart,
        billingPeriodEnd: billingYearEnd,
        chartData
    };
}

function isLeapYear(year: number) {
    return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
}
