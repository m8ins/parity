import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractCard } from '../contract-card';
import { ContractDetail } from '../contract-detail';
import { Dashboard } from '../dashboard';
import { DeleteMeterDialog } from '../DeleteMeterDialog';
import { understandingFixture, UNDERSTANDING_AS_OF } from '@/lib/understanding-fixture';
import type { User } from '@supabase/supabase-js';
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('../contract-chart', () => ({ ContractChart: () => <div>Verbrauchsdiagramm</div> }));
const { meter, data } = understandingFixture('electricity');

describe('Ergebnis finden und verwalten', () => {
  it('führt aus dem sichtbaren Ergebnis zum tatsächlichen Zähler und Zeitraum, vor dem letzten Stand', () => {
    const { container } = render(<ContractCard meter={meter} meterData={data} onUpdate={vi.fn()} onReadingAdded={vi.fn()} onDelete={vi.fn()} />);
    const result = screen.getByRole('link', { name: /Voraussichtlich.*Nachzahlung.*Einschätzung ansehen/ });
    expect(result).toHaveAttribute('href', `/meter/${meter.id}?period=${data.contracts[0].id}`);
    expect(screen.getByRole('heading', { level: 2, name: meter.name })).toBeVisible();
    expect(within(result).queryByRole('heading')).toBeNull();
    expect(result.compareDocumentPosition(container.querySelector('.meter-reading-summary')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stand erfassen' })).toBeVisible();
  });
  it('behält den Detailzugang ohne Abrechnungszeitraum statt einen ungültigen Zeitraum anzuhängen', () => {
    render(<ContractCard meter={meter} meterData={{ contracts: [], readings: [], ratesByContract: {} }} onUpdate={vi.fn()} onReadingAdded={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('link', { name: /Für die Prognose fehlt.*Einschätzung ansehen/ })).toHaveAttribute('href', `/meter/${meter.id}`);
  });
  it('öffnet aus der kompakten Hinzufügen-Aktion weiterhin die geschützte Einrichtung', async () => {
    render(<Dashboard user={{ id: meter.user_id } as User} initialMeters={[meter]} initialData={{ [meter.id]: data }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Zähler hinzufügen' }));
    expect(await screen.findByRole('dialog', { name: 'Zähler einrichten' })).toBeVisible();
    expect(screen.getByLabelText('Name', { exact: true })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled();
  });
  it('hält Aufgabe und vollständigen langen Zählernamen im Löschdialog getrennt', () => {
    const longName = 'Strom im Keller und in der Einliegerwohnung mit einem sehr langen eindeutigen Namen';
    render(<DeleteMeterDialog meter={{ ...meter, name: longName }} open onOpenChange={vi.fn()} onDeleted={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Zähler entfernen' })).toBeVisible();
    expect(screen.getByText(longName)).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Zähler entfernen' })).toHaveAccessibleDescription(new RegExp(longName));
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveFocus();
    expect(screen.getByText(/Abrechnungsergebnisse werden dauerhaft gelöscht/)).toBeVisible();
  });
  it('benennt Umbenennen explizit, während die Seitenüberschrift die Identität behält', async () => {
    render(<ContractDetail initialMeter={meter} initialData={data} asOf={UNDERSTANDING_AS_OF} />);
    const title = screen.getByRole('heading', { level: 1, name: /Strom.*Keller/ });
    expect(within(title).getByRole('button', { name: `${meter.name} umbenennen` })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: `${meter.name} umbenennen` }));
    expect(await screen.findByLabelText('Zählername')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByLabelText('Zählername')).toBeNull();
  });
});
