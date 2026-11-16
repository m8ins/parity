import { Meter, Contract, Rate, Reading, GAS_WEIGHTS } from './types';

export interface ProjectionResult {
  // Historical names retained for callers. All totals cover the billing PERIOD.
  projectedYearlyConsumption: number;
  projectedYearlyCost: number | null;
  currentYearlyPayment: number | null;
  difference: number | null;
  recommendedMonthlyPayment: number | null;
  paidUsage: number | null;
  daysTracked: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  observedConsumption: number;
  observedStart: string;
  observedEnd: string;
  chartData: ChartDataPoint[];
  monthlyBreakdown: MonthlyBreakdown[];
}
export interface ChartDataPoint {
  date: string;
  projected: number;
  actual: number | null;
}
export interface MonthlyBreakdown {
  month: string;
  end?: string;
  consumption: number;
  cost: number | null;
}
const DAY = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
export function periodEnd(contract: Contract): string {
  if (contract.period_end) return contract.period_end;
  const date = new Date(`${contract.period_start}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return iso(date.getTime());
}
export function readingsInPeriod(contract: Contract, readings: Reading[]) {
  return readings.filter(r => r.date >= contract.period_start && r.date <= periodEnd(contract))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function activeRate(rates: Rate[], date: string): Rate | undefined {
  return [...rates].sort((a, b) => a.effective_from.localeCompare(b.effective_from))
    .filter(r => r.effective_from <= date).at(-1);
}
function daysInYear(date: Date) {
  const year = date.getUTCFullYear();
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY;
}

/** Existing model: seasonal run-rate, linear interpolation of readings, and
 * annual/day proration of monthly prices/payments. UTC calendar days avoid DST.
 * End is exclusive for charges, inclusive ONLY for the closing meter reading.
 * No rates are backdated and missing money values remain null. */
export function calculateProjection(meter: Meter, contract: Contract, readings: Reading[], rates: Rate[]): ProjectionResult | null {
  const start = Date.parse(contract.period_start);
  const end = Date.parse(periodEnd(contract));
  const samples = readingsInPeriod(contract, readings);
  if (samples.length < 2 || !(end > start)) return null;
  if (samples.some((r, i) => !Number.isFinite(r.value) || r.value < 0 ||
    (i > 0 && (r.date === samples[i - 1].date || r.value < samples[i - 1].value)))) return null;
  const first = samples[0], last = samples[samples.length - 1];
  const firstTime = Date.parse(first.date), lastTime = Date.parse(last.date);
  const weight = (time: number) => {
    const date = new Date(time), month = date.getUTCMonth();
    const distribution = meter.monthly_distribution;
    const custom = distribution?.length === 12 && distribution.every(w => Number.isFinite(w) && w >= 0) && distribution.some(w => w > 0);
    if (!custom && meter.type === 'electricity') return 1 / daysInYear(date);
    const weights = custom ? distribution! : GAS_WEIGHTS;
    const days = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
    return weights[month] / days;
  };
  let trackedWeight = 0;
  for (let day = firstTime; day < lastTime; day += DAY) trackedWeight += weight(day);
  if (!(trackedWeight > 0)) return null;
  // Run-rate is in meter units; dated conversion factors are applied per day.
  const runRate = (last.value - first.value) / trackedWeight;
  const estimateReading = (time: number): number | null => {
    if (time < firstTime || time > lastTime) return null;
    const index = samples.findIndex(r => Date.parse(r.date) >= time);
    const after = samples[index];
    if (Date.parse(after.date) === time) return after.value;
    const before = samples[index - 1];
    return before.value + (after.value - before.value) *
      (time - Date.parse(before.date)) / (Date.parse(after.date) - Date.parse(before.date));
  };
  let consumption = 0, cost = 0, payments = 0, months = 0;
  let base = 0, weightedPrice = 0, observed = 0, conversionWeight = 0;
  let costsKnown = true, paymentsKnown = true;
  const chartData: ChartDataPoint[] = [];
  const monthlyBreakdown: MonthlyBreakdown[] = [];
  const baselineKnown = firstTime === start;
  const emit = (day: number) => chartData.push({ date: new Date(day).toISOString(), projected: consumption,
    actual: baselineKnown && day <= lastTime ? observed : null });
  emit(start);
  let bucket: MonthlyBreakdown | undefined;
  for (let day = start; day < end; day += DAY) {
    const date = new Date(day), dateIso = iso(day);
    const rate = activeRate(rates, dateIso);
    const factor = meter.type === 'gas' ? rate?.umrechnungsfaktor : 1;
    // Gas without a known positive factor cannot yield a defensible kWh value.
    if (factor == null || !Number.isFinite(factor) || factor <= 0) return null;
    const daily = runRate * weight(day) * factor;
    const monthlyPart = 12 / daysInYear(date);
    consumption += daily;
    conversionWeight += weight(day) * factor;
    months += monthlyPart;
    const priceKnown = rate && Number.isFinite(rate.grundpreis) && rate.grundpreis >= 0 &&
      Number.isFinite(rate.arbeitspreis) && rate.arbeitspreis >= 0;
    if (priceKnown) {
      const dailyBase = rate.grundpreis * monthlyPart;
      cost += dailyBase + daily * rate.arbeitspreis / 100;
      base += dailyBase;
      weightedPrice += weight(day) * factor * rate.arbeitspreis / 100;
    } else costsKnown = false;
    if (rate && Number.isFinite(rate.abschlag) && rate.abschlag >= 0) payments += rate.abschlag * monthlyPart;
    else paymentsKnown = false;

    const before = estimateReading(day), after = estimateReading(day + DAY);
    if (before !== null && after !== null) {
      const used = (after - before) * factor;
      observed += used;
      if (!bucket || bucket.month.slice(0, 7) !== dateIso.slice(0, 7)) {
        bucket = { month: dateIso, end: iso(day + DAY), consumption: 0, cost: 0 };
        monthlyBreakdown.push(bucket);
      }
      bucket.end = iso(day + DAY);
      bucket.consumption += used;
      bucket.cost = priceKnown && bucket.cost !== null
        ? bucket.cost + rate.grundpreis * monthlyPart + used * rate.arbeitspreis / 100 : null;
    }
    const next = day + DAY;
    if (next === end || new Date(next).getUTCDate() === 1 || samples.some(r => r.date === iso(next))) emit(next);
  }
  const difference = costsKnown && paymentsKnown ? payments - cost : null;
  return {
    projectedYearlyConsumption: consumption,
    projectedYearlyCost: costsKnown ? cost : null,
    currentYearlyPayment: paymentsKnown ? payments : null,
    difference,
    recommendedMonthlyPayment: costsKnown ? cost / months : null,
    paidUsage: costsKnown && paymentsKnown && weightedPrice > 0
      ? Math.max(0, (payments - base) / weightedPrice * conversionWeight) : null,
    daysTracked: (lastTime - firstTime) / DAY,
    billingPeriodStart: new Date(start), billingPeriodEnd: new Date(end),
    observedConsumption: observed, observedStart: samples[0].date, observedEnd: samples[samples.length - 1].date,
    chartData, monthlyBreakdown,
  };
}
