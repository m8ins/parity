import { Meter, Contract, Rate, Reading, GAS_WEIGHTS } from "./types";

export interface ProjectionResult {
  projectedYearlyConsumption: number; // kWh
  projectedYearlyCost: number; // Euro
  currentYearlyPayment: number; // Euro
  difference: number; // Euro
  recommendedMonthlyPayment: number; // Euro
  daysTracked: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  chartData: ChartDataPoint[];
  paidUsage: number; // kWh
  monthlyBreakdown: MonthlyBreakdown[]; // Optional, can be computed if needed
}

export interface ChartDataPoint {
  date: string; // ISO String
  projected: number; // Cumulative kWh
  actual: number | null; // Cumulative kWh
}

export interface MonthlyBreakdown {
  month: string; // e.g., "Jan 2024"
  consumption: number; // kWh
  cost: number; // € in this month
}

export function calculateProjection(
  meter: Meter,
  contract: Contract,
  readings: Reading[],
  rates: Rate[],
): ProjectionResult | null {
  if (!readings || readings.length < 2) {
    return null;
  }

  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const sortedRates = [...rates].sort(
    (a, b) =>
      new Date(a.effective_from).getTime() -
      new Date(b.effective_from).getTime(),
  );

  // Billing period bounds: explicit period_start / period_end from the
  // contract. If period_end is absent, derive as period_start + 1 year.
  const billingYearStart = new Date(contract.period_start);
  const billingYearEnd = contract.period_end
    ? new Date(contract.period_end)
    : new Date(
        billingYearStart.getFullYear() + 1,
        billingYearStart.getMonth(),
        billingYearStart.getDate(),
      );

  // Run-rate is derived only from readings inside this billing period, so a
  // meter spanning multiple contract years doesn't mix prior periods into the
  // current projection. For a single-period meter this is simply all readings.
  const periodReadings = sortedReadings.filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= billingYearStart.getTime() && t <= billingYearEnd.getTime();
  });
  if (periodReadings.length < 2) {
    return null;
  }

  const firstReading = periodReadings[0];
  const lastReading = periodReadings[periodReadings.length - 1];

  // Use the latest rate's umrechnungsfaktor for the overall consumption calculation.
  const latestRate = sortedRates[sortedRates.length - 1];
  const factor =
    meter.type === "gas" ? (latestRate?.umrechnungsfaktor ?? 10) : 1;
  const consumption = (lastReading.value - firstReading.value) * factor;

  const startDate = new Date(firstReading.date);
  const endDate = new Date(lastReading.date);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const daysTracked = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysTracked <= 0) return null;

  const getDayWeight = (date: Date) => {
    if (
      meter.monthly_distribution &&
      meter.monthly_distribution.length === 12
    ) {
      const month = date.getMonth();
      const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
      return meter.monthly_distribution[month] / daysInMonth;
    }
    if (meter.type === "electricity") {
      return 1 / (365 + (isLeapYear(date.getFullYear()) ? 1 : 0));
    } else {
      const month = date.getMonth();
      const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
      return GAS_WEIGHTS[month] / daysInMonth;
    }
  };

  let trackedWeight = 0;
  const loopDate = new Date(startDate);
  while (loopDate < endDate) {
    trackedWeight += getDayWeight(loopDate);
    loopDate.setDate(loopDate.getDate() + 1);
  }
  if (trackedWeight <= 0) trackedWeight = 0.0001;

  const projectedYearlyConsumption = consumption / trackedWeight;

  let projectedYearlyCost = 0;
  let expectedYearlyPayment = 0;
  let totalBasePrice = 0;
  let totalWeightedEnergyPrice = 0;

  const chartData: ChartDataPoint[] = [];
  let accumulatedProjectedConsumption = 0;
  const sortedReadingsByTime = [...sortedReadings].map((r) => ({
    ...r,
    time: new Date(r.date).getTime(),
  }));

  const estimateReading = (targetDate: Date): number | null => {
    const time = targetDate.getTime();
    if (
      time < sortedReadingsByTime[0].time ||
      time > sortedReadingsByTime[sortedReadingsByTime.length - 1].time
    ) {
      return null;
    }
    const afterIndex = sortedReadingsByTime.findIndex((r) => r.time >= time);
    if (afterIndex === -1) return null;
    const after = sortedReadingsByTime[afterIndex];
    if (after.time === time) return after.value;
    if (afterIndex === 0) return after.value;
    const before = sortedReadingsByTime[afterIndex - 1];
    const span = after.time - before.time;
    const progress = (time - before.time) / span;
    return before.value + (after.value - before.value) * progress;
  };

  const findActiveRate = (date: Date): Rate | null => {
    for (let i = sortedRates.length - 1; i >= 0; i--) {
      if (new Date(sortedRates[i].effective_from) <= date) {
        return sortedRates[i];
      }
    }
    return sortedRates[0] ?? null;
  };

  const baselineReading = estimateReading(billingYearStart);

  chartData.push({
    date: billingYearStart.toISOString(),
    projected: 0,
    actual: baselineReading !== null ? 0 : null,
  });

  // Emit dates = monthly grid points UNION actual reading dates, so the chart's
  // actual line gets a vertex at every reading (incl. the latest one) while the
  // projected curve stays smooth across the whole billing year.
  const emitTimes = new Set<number>();
  const gridDate = new Date(billingYearStart);
  gridDate.setMonth(gridDate.getMonth() + 1);
  while (gridDate < billingYearEnd) {
    emitTimes.add(gridDate.getTime());
    gridDate.setMonth(gridDate.getMonth() + 1);
  }
  for (const r of sortedReadingsByTime) {
    if (r.time > billingYearStart.getTime() && r.time < billingYearEnd.getTime()) {
      emitTimes.add(r.time);
    }
  }
  const emitDates = [...emitTimes].sort((a, b) => a - b);
  let emitPtr = 0;

  const calcDate = new Date(billingYearStart);

  while (calcDate < billingYearEnd) {
    const activeRate = findActiveRate(calcDate);
    const dayWeight = getDayWeight(calcDate);
    const dailyConsumption = projectedYearlyConsumption * dayWeight;

    accumulatedProjectedConsumption += dailyConsumption;

    while (
      emitPtr < emitDates.length &&
      calcDate.getTime() >= emitDates[emitPtr]
    ) {
      const pointDate = new Date(emitDates[emitPtr]);
      const val = estimateReading(pointDate);
      const actual =
        val !== null && baselineReading !== null
          ? (val - baselineReading) * factor
          : null;
      chartData.push({
        date: pointDate.toISOString(),
        projected: accumulatedProjectedConsumption,
        actual,
      });
      emitPtr++;
    }

    if (activeRate) {
      const year = calcDate.getFullYear();
      const daysInYear = 365 + (isLeapYear(year) ? 1 : 0);
      const dailyBasePrice = (activeRate.grundpreis * 12) / daysInYear;
      const dailyEnergyCost =
        (dailyConsumption * activeRate.arbeitspreis) / 100;
      projectedYearlyCost += dailyBasePrice + dailyEnergyCost;
      totalBasePrice += dailyBasePrice;
      totalWeightedEnergyPrice += (activeRate.arbeitspreis / 100) * dayWeight;

      const dailyPayment = (activeRate.abschlag * 12) / daysInYear;
      expectedYearlyPayment += dailyPayment;
    }

    calcDate.setDate(calcDate.getDate() + 1);
  }

  const val = estimateReading(billingYearEnd);
  const actual =
    val !== null && baselineReading !== null
      ? (val - baselineReading) * factor
      : null;
  appendYearEndpoint(
    chartData,
    billingYearEnd,
    accumulatedProjectedConsumption,
    actual,
  );

  // Per calendar month, derived from real readings (month boundaries are
  // interpolated). Includes the current partial month up to the last reading.
  const lastReadingDate = new Date(lastReading.date);
  const monthlyBreakdown: MonthlyBreakdown[] = [];
  // Anchor month boundaries on billingYearStart (matching the chart grid) so they
  // align exactly with reading dates that fall on the 1st.
  const monthCursor = new Date(billingYearStart);
  while (monthCursor < billingYearEnd) {
    const monthStart = new Date(monthCursor);
    const nextMonth = new Date(monthCursor);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth < lastReadingDate ? nextMonth : lastReadingDate;

    if (monthEnd.getTime() > monthStart.getTime()) {
      const startVal = estimateReading(monthStart);
      const endVal = estimateReading(monthEnd);

      if (startVal !== null && endVal !== null) {
        const consumption = (endVal - startVal) * factor;
        const rate = findActiveRate(monthStart);
        const cost = rate
          ? (consumption * rate.arbeitspreis) / 100 + rate.grundpreis
          : 0;

        monthlyBreakdown.push({
          month: monthStart.toISOString(),
          consumption,
          cost,
        });
      }
    }

    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  const difference = expectedYearlyPayment - projectedYearlyCost;
  const recommendedMonthlyPayment = projectedYearlyCost / 12;

  let paidUsage = 0;
  if (totalWeightedEnergyPrice > 0) {
    paidUsage =
      (expectedYearlyPayment - totalBasePrice) / totalWeightedEnergyPrice;
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
    chartData,
    monthlyBreakdown,
  };
}

function isLeapYear(year: number) {
  return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}

function appendYearEndpoint(
  chartData: ChartDataPoint[],
  billingYearEnd: Date,
  accumulatedProjectedConsumption: number,
  actual: number | null,
) {
  const lastPt = chartData[chartData.length - 1];
  if (new Date(lastPt.date).getTime() < billingYearEnd.getTime()) {
    chartData.push({
      date: billingYearEnd.toISOString(),
      projected: accumulatedProjectedConsumption,
      actual,
    });
  }
}
