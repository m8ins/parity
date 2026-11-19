import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RateHistory } from '../history-lists';
import { ContractDetail } from '../contract-detail';
import { understandingFixture } from '@/lib/understanding-fixture';
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc, from }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), back: vi.fn() }) }));
vi.mock('../contract-chart', () => ({ ContractChart: () => <div>Verbrauchsdiagramm</div> }));
const fixture = understandingFixture();
const contract = fixture.data.contracts[0];
const rates = fixture.data.ratesByContract[contract.id];
const onChange = vi.fn(), onUnderstand = vi.fn();
function show(gas = false, initialData = rates) {
  return render(<RateHistory contract={contract} initialData={initialData} isGas={gas} userId="synthetic-owner" onChange={onChange} onUnderstand={onUnderstand} asOf="2026-11-16" />);
}
async function open() { await userEvent.click(screen.getByRole('button', { name: 'Konditionen ändern' })); }
async function edit(label: string, value: string) {
  const input = screen.getByLabelText(label, { exact: true });
  await userEvent.clear(input);
  if (value) await userEvent.type(input, value);
}
async function review() { await userEvent.click(screen.getByRole('button', { name: 'Änderung prüfen' })); }
async function save() { await userEvent.click(screen.getByRole('button', { name: 'Neue Konditionen speichern' })); }
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); rpc.mockResolvedValue({ data: { confirmed: true, rates }, error: null }); });
describe('dated condition management', () => {
  it('starts with quiet current values and closed history', () => {
    show();
    expect(screen.getByText(/Konditionshistorie/).closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Konditionen ändern' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Gültig ab')).not.toBeInTheDocument();
  });
  it('prefills real editable values from the selected past date, preserving the later rate', async () => {
    show(); await open();
    expect(screen.getByLabelText('Arbeitspreis')).toHaveValue('35');
    await edit('Gültig ab', '2026-02-01');
    expect(screen.getByLabelText('Arbeitspreis')).toHaveValue('30');
    expect(screen.getByText(/nächste Änderung ab 1. Apr. 2026 bleibt bestehen/)).toBeInTheDocument();
    await edit('Arbeitspreis', '31,23456'); await review();
    expect(screen.getByText('Unverändert übernommen (2)')).toBeInTheDocument();
    await save();
    expect(rpc.mock.calls[0][1].p_payload).toMatchObject({ effective_from: '2026-02-01', arbeitspreis: 31.23456, grundpreis: 10, abschlag: 100, operation: 'create' });
    expect(onChange).toHaveBeenCalledWith(rates);
    await userEvent.click(screen.getByRole('button', { name: 'Aktualisierte Einschätzung ansehen' }));
    expect(onUnderstand).toHaveBeenCalledOnce();
  });
  it.each(['Grundpreis', 'Arbeitspreis', 'Abschlag'])('changes only %s and retains an explicit zero', async label => {
    show(); await open(); await edit(label, '0'); await review(); await save();
    const key = { Grundpreis: 'grundpreis', Arbeitspreis: 'arbeitspreis', Abschlag: 'abschlag' }[label]!;
    expect(rpc.mock.calls[0][1].p_payload[key]).toBe(0);
  });
  it('preserves precision for several gas values and does not confuse empty with zero', async () => {
    show(true); await open();
    await edit('Grundpreis', '12,345'); await edit('Arbeitspreis', '32,678'); await edit('Abschlag', '');
    await edit('Umrechnungsfaktor', '10,1234567'); await review();
    expect(screen.getByLabelText('Abschlag')).toHaveAttribute('aria-invalid', 'true');
    expect(rpc).not.toHaveBeenCalled();
    await edit('Abschlag', '0'); await review(); await save();
    expect(rpc.mock.calls[0][1].p_payload).toMatchObject({ grundpreis: 12.345, arbeitspreis: 32.678, abschlag: 0, umrechnungsfaktor: 10.1234567 });
  });
  it('requires an explicit date rebase or preserves changed inputs, and protects discard', async () => {
    show(); await open(); await edit('Arbeitspreis', '32,1');
    fireEvent.change(screen.getByLabelText('Gültig ab'), { target: { value: '2026-02-01' } });
    expect(screen.getByRole('heading', { name: 'Gültigkeitsdatum ändern?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Datum beibehalten' }));
    expect(screen.getByLabelText('Arbeitspreis')).toHaveValue('32,1');
    await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.getByRole('heading', { name: 'Eingaben verwerfen?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Weiter bearbeiten' }));
    expect(screen.getByLabelText('Arbeitspreis')).toHaveValue('32,1');
  });
  it('does not prompt to discard unchanged prefilled values', async () => {
    show(); await open(); await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('blocks double submission, closing and field changes while pending', async () => {
    let finish!: (value: unknown) => void;
    rpc.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    show(); await open(); await edit('Arbeitspreis', '0'); await review();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Neue Konditionen speichern' }));
    expect(rpc).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Wird gespeichert …' })).toBeDisabled();
    await userEvent.keyboard('{Escape}'); expect(screen.getByRole('dialog')).toBeInTheDocument();
    finish({ data: { confirmed: true, rates }, error: null });
    await screen.findByRole('heading', { name: 'Konditionen gespeichert' });
  });
  it('recovers the exact unconfirmed request after a real component remount', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'lost response' } });
    const first = show(); await open(); await edit('Arbeitspreis', '31,56789'); await review(); await save();
    const sent = rpc.mock.calls[0][1];
    expect(screen.getByRole('alert')).toHaveTextContent('noch nicht bestätigt');
    expect(screen.queryByRole('heading', { name: 'Konditionen gespeichert' })).not.toBeInTheDocument();
    first.unmount(); show(); await open();
    await userEvent.click(screen.getByRole('button', { name: 'Speicherung prüfen' }));
    expect(rpc.mock.calls[1][1]).toEqual(sent);
    expect(sessionStorage.length).toBe(0);
    expect(screen.getByRole('heading', { name: 'Konditionen gespeichert' })).toBeInTheDocument();
  });
  it('does not send if session storage cannot preserve the replay request', async () => {
    show(); await open(); await edit('Abschlag', '0'); await review();
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    await save(); expect(rpc).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('nichts gesendet'); failure.mockRestore();
  });
  it('never resumes a request belonging to a different account', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'lost' } });
    const first = show(); await open(); await edit('Abschlag', '0'); await review(); await save();
    first.unmount();
    render(<RateHistory contract={contract} initialData={rates} isGas={false} userId="different-owner" onChange={onChange} onUnderstand={onUnderstand} asOf="2026-11-16" />);
    await open();
    expect(screen.getByLabelText('Abschlag')).toHaveValue('110');
    expect(screen.queryByRole('button', { name: 'Speicherung prüfen' })).not.toBeInTheDocument();
    expect(rpc).toHaveBeenCalledOnce();
  });
  it('explains which predecessor will apply when a later rate is deleted', async () => {
    show(); await userEvent.click(screen.getByText(/Konditionshistorie/)); await userEvent.click(screen.getByText('Ab 1. Apr. 2026'));
    await userEvent.click(within(screen.getByText('Ab 1. Apr. 2026').closest('details')!).getByRole('button', { name: 'Löschen' }));
    expect(screen.getByText(/Danach gelten die Konditionen vom 1. Jan. 2026/)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects duplicate creation and offers explicit correction with old values retained', async () => {
    show(); await open(); await edit('Gültig ab', '2026-04-01'); await edit('Arbeitspreis', '0'); await review();
    expect(screen.getByText(/Nutze „Korrigieren“/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Verwerfen' }));
    await userEvent.click(screen.getByText(/Konditionshistorie/));
    await userEvent.click(screen.getByText('Ab 1. Jan. 2026'));
    const entry = screen.getByText('Ab 1. Jan. 2026').closest('details')!;
    await userEvent.click(within(entry).getByRole('button', { name: 'Korrigieren' }));
    expect(screen.getByLabelText('Gültig ab')).toHaveAttribute('readonly');
    await edit('Arbeitspreis', '0'); await review();
    await userEvent.click(screen.getByRole('button', { name: 'Korrektur speichern' }));
    expect(rpc.mock.calls[0][1].p_payload).toMatchObject({ operation: 'correct', rate_id: rates[0].id, effective_from: '2026-01-01' });
  });
  it('requires explicit confirmation of the gap before deleting the first rate', async () => {
    show(); await userEvent.click(screen.getByText(/Konditionshistorie/)); await userEvent.click(screen.getByText('Ab 1. Jan. 2026'));
    const entry = screen.getByText('Ab 1. Jan. 2026').closest('details')!;
    await userEvent.click(within(entry).getByRole('button', { name: 'Löschen' }));
    expect(screen.getByText(/Dadurch entsteht hier eine Konditionslücke/)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Folgen bestätigen und löschen' }));
    expect(rpc.mock.calls[0][1].p_payload).toMatchObject({ operation: 'delete', rate_id: rates[0].id });
  });
  it('keeps conflict inputs and requires reloading before resubmission', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: '40001' } });
    from.mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { ...contract, rates }, error: null }) }) }) });
    show(); await open(); await edit('Arbeitspreis', '33,333'); await review(); await save();
    expect(screen.getByRole('button', { name: 'Neue Konditionen speichern' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Aktuellen Stand laden' }));
    expect(screen.getByLabelText('Arbeitspreis')).toHaveValue('33,333');
    await review(); await save(); expect(rpc).toHaveBeenCalledTimes(2);
  });
  it('updates the existing estimate and returns focus to Verstehen in the same period', async () => {
    rpc.mockResolvedValue({ data: { confirmed: true, rates: [...rates, { ...rates[1], id: 'new', effective_from: '2026-11-16', arbeitspreis: 0 }] }, error: null });
    render(<ContractDetail initialMeter={fixture.meter} initialData={fixture.data} asOf="2026-11-16" />);
    const before = screen.getByRole('heading', { name: /Nachzahlung/ }).textContent;
    await userEvent.click(screen.getByRole('tab', { name: 'Konditionen' }));
    await open(); await edit('Arbeitspreis', '0'); await review(); await save();
    await userEvent.click(screen.getByRole('button', { name: 'Aktualisierte Einschätzung ansehen' }));
    expect(screen.getByRole('heading', { name: /Erstattung/ }).textContent).not.toBe(before);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Verstehen' })).toHaveFocus());
    expect(screen.getByText('Kosten und Abschlag').closest('details')).not.toHaveAttribute('open');
  });
});
