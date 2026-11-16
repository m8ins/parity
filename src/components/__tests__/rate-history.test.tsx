import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RateHistory } from '../history-lists';
const insert = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => ({ insert }) }) }));
describe('Bestehende Konditionsgenauigkeit', () => {
  it('übermittelt Preise und Gasfaktor mit mehr als zwei Nachkommastellen', async () => {
    insert.mockReturnValue({ select: () => ({ single: async () => ({ data: null, error: { message: 'synthetic' } }) }) });
    const user = userEvent.setup();
    render(<RateHistory contractId="synthetic-period" initialData={[]} isGas />);
    await user.type(screen.getByLabelText('Gültig ab'), '2026-11-01');
    await user.type(screen.getByLabelText('Grundpreis (€/Monat)'), '12.345');
    await user.type(screen.getByLabelText('Arbeitspreis (ct/kWh)'), '32.678');
    await user.type(screen.getByLabelText('Abschlag (€/Monat)'), '100.123');
    await user.clear(screen.getByLabelText('Umrechnungsfaktor (kWh/m³)'));
    await user.type(screen.getByLabelText('Umrechnungsfaktor (kWh/m³)'), '10.12345');
    await user.click(screen.getByRole('button', { name: 'Hinzufügen' }));
    expect(insert).toHaveBeenCalledWith({ contract_id: 'synthetic-period', effective_from: '2026-11-01', grundpreis: 12.345, arbeitspreis: 32.678, abschlag: 100.123, umrechnungsfaktor: 10.12345 });
    expect(screen.getByRole('alert')).toHaveTextContent('Eingaben bleiben erhalten');
  });
});
