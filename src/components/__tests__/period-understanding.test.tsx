import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeriodUnderstanding } from '../PeriodUnderstanding';
import { ContractDetail } from '../contract-detail';
import { understandingFixture, UNDERSTANDING_AS_OF } from '@/lib/understanding-fixture';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), back: vi.fn() }) }));
vi.mock('../contract-chart', () => ({ ContractChart: () => <div>Verbrauchsdiagramm</div> }));
// jsdom lacks scrolling; keyboard-driven Radix selection scrolls its option.
Element.prototype.scrollIntoView = vi.fn();
const show = (scenario: string, index = 0) => {
  const { meter, data } = understandingFixture(scenario);
  const contract = data.contracts[index];
  return render(<PeriodUnderstanding meter={meter} contract={contract} readings={data.readings} rates={data.ratesByContract[contract.id]} asOf={UNDERSTANDING_AS_OF} />);
};
describe('Verstehen', () => {
  it.each([
    ['electricity', 0, 'understand-result-due'],
    ['gas', 1, 'understand-result-refund'],
    ['zero', 0, 'understand-result-neutral'],
    ['missing', 0, 'understand-result-neutral'],
  ])('uses the matching status for %s without a color-only outcome', (scenario, index, expected) => {
    const { container } = show(String(scenario), Number(index));
    expect(container.querySelector('.understand-result')).toHaveClass(String(expected));
    expect(container.querySelector('.understand-result')).toHaveTextContent(/Nachzahlung|Erstattung|Preise fehlen/);
  });

  it('names the observation interval, assumption and payment basis without claiming actual payments', async () => {
    show('electricity');
    expect(screen.getByRole('heading', { name: /62,09 € Nachzahlung/ })).toBeInTheDocument();
    expect(screen.getByText('Kosten und Abschlag').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Ablesungen').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Verbrauchsdiagramm').compareDocumentPosition(screen.getByText('Kosten und Abschlag')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(screen.getByText('Kosten und Abschlag'));
    expect(screen.getByText(/Tatsächliche Zahlungen sind nicht erfasst/)).toBeVisible();
    await userEvent.click(screen.getByText('Monatswerte ansehen'));
    expect(screen.getByText(/Zwischen Ablesungen geschätzt/)).toBeVisible();
    await userEvent.click(screen.getByText('Wie wird gerechnet?'));
    expect(screen.getByText(/Gleichmäßige Stromverteilung/)).toBeVisible();
  });
  it('distinguishes recorded refunds from retrospective gas estimates and keeps cubic meter observations', () => {
    show('gas', 1);
    expect(screen.getByRole('heading', { name: '328,00 € Erstattung' })).toBeInTheDocument();
    expect(screen.getByText(/^Erfasste Schlussabrechnung/)).toBeInTheDocument();
    expect(screen.getAllByText(/328,00 €/).length).toBeGreaterThan(0);
    expect(screen.getByText(/1.000 m³ →/)).toHaveTextContent('10.000 kWh');
    expect(screen.queryByText('Abschlag zur Orientierung')).not.toBeInTheDocument();
  });
  it('keeps observed values when costs are missing and preserves explicit zero costs', () => {
    const missing = show('missing');
    expect(screen.getByText(/Preise fehlen/)).toBeInTheDocument();
    expect(screen.getAllByText('Nicht berechenbar').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3.040 kWh/).length).toBeGreaterThan(0);
    missing.unmount();
    show('zero');
    expect(screen.getByText('Keine Nachzahlung erwartet')).toBeInTheDocument();
  });
  it('explains zero or one reading without inventing zero consumption', () => {
    const empty = show('none');
    expect(screen.getByText(/Erfasse zwei Zählerstände/)).toBeInTheDocument();
    expect(screen.queryByText('0 kWh')).not.toBeInTheDocument();
    empty.unmount();
    show('one');
    expect(screen.getByText(/Noch eine Ablesung/)).toBeInTheDocument();
    expect(screen.getByText('3.650 kWh')).toBeInTheDocument();
    expect(screen.queryByText(/Abgeleiteter Verbrauch/)).not.toBeInTheDocument();
  });
  it('switches periods independently of all-meter reading history and preserves management access', async () => {
    const { meter, data } = understandingFixture('gas');
    render(<ContractDetail initialMeter={meter} initialData={data} initialContractId="period-previous" asOf={UNDERSTANDING_AS_OF} />);
    expect(screen.getByRole('heading', { name: '328,00 € Erstattung' })).toBeInTheDocument();
    screen.getByRole('combobox', { name: 'Abrechnungszeitraum' }).focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Home}{Enter}');
    expect(screen.queryByText(/Schlussabrechnung ·/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Erstattung/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Verwalten' }));
    expect(screen.getByRole('button', { name: 'Details bearbeiten' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Ablesungen' }));
    expect(screen.getByText('Alle Ablesungen dieses Zählers')).toBeInTheDocument();
  });
});
