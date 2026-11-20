import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillingSettlement } from '../BillingSettlement';
import { BillingContinuation } from '../BillingContinuation';
import { understandingFixture } from '@/lib/understanding-fixture';
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc, from }) }));
const fixture = understandingFixture();
const period = fixture.data.contracts[0];
const rates = fixture.data.ratesByContract[period.id];
const onSaved = vi.fn(), onEnd = vi.fn(), onSelect = vi.fn(), onReload = vi.fn();
const settled = { ...period, settlement_amount: -123.456, settlement_date: '2026-11-01' };
function settlement(p = period) { return render(<BillingSettlement meter={fixture.meter} period={p} onSaved={onSaved} onEnd={onEnd} />); }
function continuation(p = period, all = [p], data = rates) { return render(<BillingContinuation meter={fixture.meter} period={p} contracts={all} rates={data} onSaved={onSaved} onSelect={onSelect} onReload={onReload} />); }
async function beginSettlement() { await userEvent.click(screen.getByRole('button', { name: /Abrechnung (erfassen|korrigieren)/ })); }
async function choose(name: string) { await userEvent.click(screen.getByRole('radio', { name: name === 'Ausgeglichen' ? 'Erstattung' : name })); }
async function beginContinuation(start?: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Neuen Zeitraum anlegen' }));
  if (start) fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: start } });
  await userEvent.click(screen.getByRole('button', { name: 'Konditionen prüfen' }));
}
async function review() { await userEvent.click(screen.getByRole('button', { name: 'Weiter zur Prüfung' })); }
async function confirm() { await userEvent.click(screen.getByRole('checkbox')); await userEvent.click(screen.getByRole('button', { name: 'Zeitraum beginnen' })); }
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); vi.clearAllMocks(); sessionStorage.clear(); rpc.mockResolvedValue({ data: { ...period, settlement_amount: 0, settlement_date: '2026-11-01' }, error: null }); });
describe('actual billing result', () => {
  it('offers two native radio segments and a trailing currency addon', async () => {
    settlement(); await beginSettlement();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByLabelText('Betrag')).toHaveAttribute('placeholder', '15,37');
    expect(screen.getByLabelText('Betrag').closest('[data-slot="input-group"]')).toHaveTextContent('€');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
  it.each([['Erstattung', 1234.567], ['Nachzahlung', -1234.567], ['Ausgeglichen', 0]] as const)('records %s without typing a sign and preserves precision', async (kind, amount) => {
    settlement(); await beginSettlement(); await choose(kind);
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: kind === 'Ausgeglichen' ? '0' : '1.234,567' } });
    if (kind === 'Ausgeglichen') expect(screen.getByRole('status')).toHaveTextContent('ausgeglichen');
    fireEvent.change(screen.getByLabelText('Abrechnungsdatum'), { target: { value: '2026-11-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Abrechnung speichern' }));
    expect(rpc).toHaveBeenCalledWith('save_billing_settlement', expect.objectContaining({ p_amount: amount, p_date: '2026-11-01', p_expected_amount: null }));
    expect(onSaved).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'Abrechnung gespeichert' })).toBeInTheDocument();
  });
  it('requires a known actual end and opens the existing end action without saving', async () => {
    settlement({ ...period, period_end: undefined }); await beginSettlement();
    expect(screen.queryByRole('group', { name: 'Ergebnis' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ende festlegen' }));
    expect(onEnd).toHaveBeenCalledOnce(); expect(rpc).not.toHaveBeenCalled();
  });
  it('does not turn an empty amount or date into an explicit zero', async () => {
    settlement(); await beginSettlement(); await choose('Erstattung');
    await userEvent.click(screen.getByRole('button', { name: 'Abrechnung speichern' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Betrag ab 0'); expect(rpc).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '15' } });
    await userEvent.click(screen.getByRole('button', { name: 'Abrechnung speichern' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Abrechnungsdatum'); expect(rpc).not.toHaveBeenCalled();
  });
  it('prefills a correction without marking it dirty; protects real changes', async () => {
    settlement(settled); await beginSettlement(); expect(screen.getByLabelText('Betrag')).toHaveValue('123,456');
    await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await beginSettlement(); fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '200' } });
    await userEvent.keyboard('{Escape}'); expect(screen.getByRole('heading', { name: 'Eingaben verwerfen?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Weiter bearbeiten' })); expect(screen.getByLabelText('Betrag')).toHaveValue('200');
  });
  it('restores exactly the unconfirmed absolute target after remount', async () => {
    rpc.mockRejectedValueOnce(new Error('lost'));
    const first = settlement(settled); await beginSettlement();
    fireEvent.change(screen.getByLabelText('Betrag'), { target: { value: '222,333' } });
    await userEvent.click(screen.getByRole('button', { name: 'Abrechnung speichern' }));
    expect(await screen.findByRole('button', { name: 'Speicherung prüfen' })).toBeInTheDocument(); expect(onSaved).not.toHaveBeenCalled();
    const sent = rpc.mock.calls[0]; first.unmount(); settlement(settled); await beginSettlement();
    await userEvent.click(screen.getByRole('button', { name: 'Speicherung prüfen' })); expect(rpc.mock.calls[1]).toEqual(sent);
  });
});
describe('independent period continuation', () => {
  it('uses transition conditions and presents later dates without requiring settlement', async () => {
    continuation(); await beginContinuation('2026-02-01');
    expect(screen.getByLabelText('Arbeitspreis (ct/kWh)')).toHaveValue('30');
    await review(); expect(screen.getByText(/Bisheriges Ende:/)).toHaveTextContent('31. Jan. 2026');
    expect(screen.getByText('Ab 1. Apr. 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zeitraum beginnen' })).toBeDisabled();
    rpc.mockResolvedValue({ data: { confirmed: true, previous: { ...period, period_end: '2026-02-01' }, contract: { ...period, id: 'new' }, rates: [] } });
    await confirm(); expect(rpc.mock.calls[0][1].p_payload).toMatchObject({ period_start: '2026-02-01', period_end: null, arbeitspreis: 30, confirm_future: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Neuen Zeitraum ansehen' })); expect(onSelect).toHaveBeenCalledWith('new');
  });
  it('keeps the optional end empty and requires confirming a gap', async () => {
    continuation(); await beginContinuation('2027-02-01'); await review();
    expect(screen.getByText(/Es bleibt eine Lücke/)).toHaveTextContent('1. Jan. 2027');
    expect(screen.getByText(/Das bisherige Ende bleibt/)).toHaveTextContent('31. Dez. 2026');
    expect(screen.getByRole('button', { name: 'Zeitraum beginnen' })).toBeDisabled();
  });
  it('points an older period to its existing successor', async () => {
    continuation(fixture.data.contracts[1], fixture.data.contracts); await userEvent.click(screen.getByRole('button', { name: 'Neuen Zeitraum anlegen' }));
    expect(screen.queryByLabelText('Beginn')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Folgezeitraum ansehen' })); expect(onSelect).toHaveBeenCalledWith(period.id); expect(rpc).not.toHaveBeenCalled();
  });
  it('preserves edited conditions before rebasing the start', async () => {
    continuation(); await beginContinuation('2026-02-01');
    fireEvent.change(screen.getByLabelText('Arbeitspreis (ct/kWh)'), { target: { value: '31,23456' } });
    await userEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '2026-05-01' } });
    expect(screen.getByRole('heading', { name: 'Beginn ändern?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Beginn beibehalten' })); await userEvent.click(screen.getByRole('button', { name: 'Konditionen prüfen' }));
    expect(screen.getByLabelText('Arbeitspreis (ct/kWh)')).toHaveValue('31,23456');
  });
  it('blocks double submission and closing, then recovers the same request after remount', async () => {
    let finish!: (value: unknown) => void; rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const first = continuation(); await beginContinuation(); await review(); await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.dblClick(screen.getByRole('button', { name: 'Zeitraum beginnen' })); expect(rpc).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}'); expect(screen.getByRole('heading', { name: 'Neuen Zeitraum prüfen' })).toBeInTheDocument();
    finish({ error: { message: 'lost' } }); await screen.findByRole('button', { name: 'Speicherung prüfen' });
    const sent = rpc.mock.calls[0]; first.unmount(); continuation(); await userEvent.click(screen.getByRole('button', { name: 'Neuen Zeitraum anlegen' }));
    rpc.mockResolvedValueOnce({ data: { confirmed: true, previous: period, contract: { ...period, id: 'new' }, rates: [] } });
    await userEvent.click(screen.getByRole('button', { name: 'Speicherung prüfen' })); expect(rpc.mock.calls[1]).toEqual(sent);
  });
  it('blocks a new end that would exclude known future conditions', async () => {
    continuation(); await userEvent.click(screen.getByRole('button', { name: 'Neuen Zeitraum anlegen' }));
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText('Bis einschließlich (optional)'), { target: { value: '2026-03-31' } });
    await userEvent.click(screen.getByRole('button', { name: 'Konditionen prüfen' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Spätere Konditionen'); expect(rpc).not.toHaveBeenCalled();
  });
  it('keeps inputs after a competing update and requires loading the current state', async () => {
    continuation(); await beginContinuation(); await review(); rpc.mockResolvedValueOnce({ error: { code: '40001' } }); await confirm();
    expect(await screen.findByRole('button', { name: 'Aktuellen Stand laden' })).toBeInTheDocument(); expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).toBeDisabled(); expect(screen.queryByRole('button', { name: 'Zeitraum beginnen' })).not.toBeInTheDocument();
  });
});
