import { notFound } from 'next/navigation';
import { AuthScreen } from '@/components/auth-screen';
import { ContractDetail } from '@/components/contract-detail';
import { Dashboard } from '@/components/dashboard';
import { readingFixture } from '@/lib/reading-fixture';
import type { Contract, MeterData, Rate } from '@/lib/types';

// Opt-in, development-only synthetic surfaces. No alternative data/save path.
export default async function IntegrationPreview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.PARITY_DESIGN_PREVIEW !== '1') notFound();
  const { view } = await searchParams;
  const created = '2026-01-01T12:00:00Z';
  const meter = readingFixture.initialMeters[0];
  const contract: Contract = { id: '40000000-0000-4000-8000-000000000001', meter_id: meter.id, period_start: '2026-01-01', period_end: '2027-01-01', provider: 'Stadtwerke Beispiel', created_at: created, updated_at: created };
  const oldContract: Contract = { ...contract, id: '40000000-0000-4000-8000-000000000002', period_start: '2025-01-01', period_end: '2026-01-01', settlement_amount: -82.5, settlement_date: '2026-02-01' };
  const rate: Rate = { id: '50000000-0000-4000-8000-000000000001', contract_id: contract.id, effective_from: '2026-01-01', grundpreis: 12.5, arbeitspreis: 32.4, abschlag: 100, umrechnungsfaktor: 1, created_at: created };
  const data: MeterData = {
    contracts: [contract, oldContract], ratesByContract: { [contract.id]: [rate], [oldContract.id]: [{ ...rate, contract_id: oldContract.id }] },
    readings: [{ ...readingFixture.initialData[meter.id].readings[0], id: '30000000-0000-4000-8000-000000000003', date: '2026-01-01', value: 21000 }, ...readingFixture.initialData[meter.id].readings],
  };
  const gas = readingFixture.initialMeters[1];
  const gasContract = { ...contract, id: '40000000-0000-4000-8000-000000000003', meter_id: gas.id };
  const initialData = { ...readingFixture.initialData, [meter.id]: data, [gas.id]: { ...readingFixture.initialData[gas.id], contracts: [gasContract], ratesByContract: {} } };
  return <>
    <p className="parity-page text-sm">Designvorschau · synthetische Daten · keine Persistenzabnahme</p>
    {view === 'login' ? <AuthScreen /> : view === 'detail' ? <ContractDetail initialMeter={meter} initialData={data} /> : view === 'gas' ? <ContractDetail initialMeter={gas} initialData={{ ...initialData[gas.id], ratesByContract: { [gasContract.id]: [{ ...rate, contract_id: gasContract.id, umrechnungsfaktor: 10 }] } }} /> : <Dashboard {...readingFixture} initialData={initialData} />}
  </>;
}
