import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PeriodUnderstanding } from '../PeriodUnderstanding';
import { ContractCard } from '../contract-card';
import { understandingFixture, UNDERSTANDING_AS_OF } from '@/lib/understanding-fixture';
import type { ChartDataPoint } from '@/lib/calculations';
const chart = vi.hoisted(() => vi.fn());
vi.mock('../contract-chart', () => ({ ContractChart: (props: { data: ChartDataPoint[]; compact?: boolean; unit: string }) => {
  chart(props); return <div role="img" aria-label="Verbrauchskurve" />;
} }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
beforeEach(() => chart.mockClear());
const show = (scenario: string, compact = true) => {
  const { meter, data } = understandingFixture(scenario), contract = data.contracts[0];
  return render(<PeriodUnderstanding meter={meter} contract={contract} readings={data.readings} rates={data.ratesByContract[contract.id]} compact={compact} asOf={UNDERSTANDING_AS_OF} detailsHref={compact ? `/meter/${meter.id}?period=${contract.id}` : undefined} />);
};
describe('Verbrauchsverlauf auf der Zählerkarte', () => {
  it('zeigt die Kurve vor dem finanziellen Ergebnis und hält die Grafik außerhalb des Links bedienbar', () => {
    const { meter, data } = understandingFixture('electricity');
    render(<ContractCard meter={meter} meterData={data} onUpdate={vi.fn()} onReadingAdded={vi.fn()} onDelete={vi.fn()} />);
    const graph = screen.getByRole('img', { name: 'Verbrauchskurve' });
    const summary = screen.getByRole('link', { name: /Voraussichtlich.*Nachzahlung.*Einschätzung ansehen/ });
    expect(graph.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(graph.closest('a')).toBeNull();
    expect(summary).toHaveAttribute('href', `/meter/${meter.id}?period=${data.contracts[0].id}`);
    expect(screen.getByRole('button', { name: 'Stand erfassen' })).toBeVisible();
  });
  it('verwendet in kompakter und großer Ansicht dieselben Verlaufs- und Prognosedaten', () => {
    const compact = show('electricity');
    const preview = chart.mock.calls.at(-1)![0];
    expect(preview.compact).toBe(true);
    compact.unmount();show('electricity', false);
    const detail = chart.mock.calls.at(-1)![0];
    expect(detail.data).toEqual(preview.data);
    expect(detail.compact).toBeUndefined();
    expect(preview.data.some((point: ChartDataPoint) => typeof point.actual === 'number')).toBe(true);
    expect(preview.data.at(-1).date).toBe('2027-01-01T00:00:00.000Z');
  });
  it.each(['none', 'one'])('erfindet bei %s keine Kurve und behält den konkreten nächsten Schritt', scenario => {
    show(scenario);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/Ablesung|Zählerstände/)).toBeVisible();
    expect(chart).not.toHaveBeenCalled();
  });
  it('zeigt vorhandenen Verbrauch auch ohne Kostenprognose und konvertiert Gasgrafiken weiterhin in kWh', () => {
    const missing = show('missing');
    expect(screen.getByRole('img')).toBeVisible();
    expect(screen.getByText(/Preise fehlen/)).toBeVisible();
    missing.unmount();show('gas');
    expect(chart.mock.calls.at(-1)![0].unit).toBe('kWh');
  });
});
