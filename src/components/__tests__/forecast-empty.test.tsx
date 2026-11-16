import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContractCard } from '../contract-card';
import { readingFixture } from '@/lib/reading-fixture';
import type { MeterData } from '@/lib/types';
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
const meter = readingFixture.initialMeters[0];
const data = readingFixture.initialData[meter.id];
const show = (meterData: MeterData) => render(<ContractCard meter={meter} meterData={meterData} onDelete={vi.fn()} onUpdate={vi.fn()} onReadingAdded={vi.fn()} />);
describe('Fehlende Prognose', () => {
  it('erkennt vorhandene Ablesungen an und zeigt fehlende Werte nicht als Null', () => {
    show(data);
    expect(screen.getByText('24.398,2')).toBeInTheDocument();
    expect(screen.getByText(/Für die Prognose fehlt ein Abrechnungszeitraum/)).toBeInTheDocument();
    expect(screen.queryByText('0,00 €')).not.toBeInTheDocument();
    expect(screen.queryByText('Keine Daten')).not.toBeInTheDocument();
    expect(screen.queryByText(/0,00 € \/ Jahr/)).not.toBeInTheDocument();
  });
  it('zählt nur Ablesungen im gewählten Zeitraum und behält explizite Nullabschläge', () => {
    const contract = { id: 'c1', meter_id: meter.id, period_start: '2026-11-01', created_at: '', updated_at: '' };
    show({ ...data, contracts: [contract], ratesByContract: { c1: [{ id: 'r1', contract_id: 'c1', effective_from: '2026-11-01', grundpreis: 0, arbeitspreis: 0, abschlag: 0, umrechnungsfaktor: 1, created_at: '' }] } });
    expect(screen.getByText(/Erfasse zwei Zählerstände/)).toBeInTheDocument();
    expect(screen.queryByText(/Nachzahlung:/)).not.toBeInTheDocument();
    expect(screen.getByText('24.398,2')).toBeInTheDocument();
  });
});
