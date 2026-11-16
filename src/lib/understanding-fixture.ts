import { readingFixture } from './reading-fixture';
import type { Contract, Meter, MeterData, Rate, Reading } from './types';

export const UNDERSTANDING_AS_OF = '2026-11-16';
// Pure synthetic data: importable in tests and the opt-in preview, no DB writes.
export function understandingFixture(scenario = 'electricity'): { meter: Meter; data: MeterData } {
  const gas = scenario.startsWith('gas');
  const meter: Meter = { ...readingFixture.initialMeters[gas ? 1 : 0],
    name: scenario === 'large' ? 'Strom · Werkstatt und Einliegerwohnung im hinteren Haus mit sehr langem Zählernamen' : gas ? 'Gas · Hauswirtschaft' : 'Strom · Keller' };
  const period: Contract = { id: 'period-current', meter_id: meter.id, period_start: '2026-01-01', period_end: '2027-01-01', provider: 'Stadtwerke Beispiel', created_at: '', updated_at: '' };
  const previous: Contract = { ...period, id: 'period-previous', period_start: '2025-01-01', period_end: '2026-01-01', settlement_amount: gas ? 328 : -150, settlement_date: '2026-02-12' };
  const rate = (contract: Contract, props: Partial<Rate> = {}): Rate => ({ id: `${contract.id}-rate`, contract_id: contract.id, effective_from: contract.period_start,
    grundpreis: 10, arbeitspreis: gas ? 10 : 30, abschlag: gas ? 130 : 100, umrechnungsfaktor: gas ? 10 : 1, created_at: '', ...props });
  const reading = (date: string, value: number): Reading => ({ id: date, meter_id: meter.id, date, value, created_at: '' });
  let readings = [reading('2025-01-01', 0), reading('2026-01-01', gas ? 1000 : 3650), reading('2026-04-01', gas ? 1440 : 4550), reading('2026-11-01', gas ? 1735 : 6690)];
  let rates = [rate(period), rate(period, { id: 'changed', effective_from: '2026-04-01', arbeitspreis: gas ? 12 : 35, abschlag: gas ? 140 : 110 })];
  if (scenario === 'none') readings = [];
  if (scenario === 'one') readings = [reading('2026-01-01', 3650)];
  if (scenario === 'missing') rates = [];
  if (scenario === 'zero') rates = [rate(period, { grundpreis: 0, arbeitspreis: 0, abschlag: 0 })];
  if (scenario === 'large') readings = [reading('2026-01-01', 123456789.12345), reading('2026-11-01', 987654321.12345)];
  if (scenario === 'short') {
    period.period_start = '2026-01-15'; period.period_end = '2026-02-14';
    readings = [reading('2026-01-14', 999), reading('2026-01-15', 1000), reading('2026-02-14', 1300), reading('2026-03-01', 2000)];
    rates = [rate(period)];
  }
  if (scenario === 'gas-custom') meter.monthly_distribution = Array(12).fill(1 / 12);
  return { meter, data: { contracts: [period, previous], readings, ratesByContract: { [period.id]: rates,
    [previous.id]: [rate(previous), rate(previous, { id: 'old-changed', effective_from: '2025-04-01', arbeitspreis: gas ? 12 : 35 })] } } };
}
