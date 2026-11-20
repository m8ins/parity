import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadingDialog } from '../reading-dialog';
import { localToday } from '@/lib/readings';

const { getUser, rpc, insert, single } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), insert: vi.fn(), single: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ rpc, auth: { getUser } }),
}));

async function open(type: 'gas' | 'electricity' = 'electricity') {
  const onSuccess = vi.fn();
  const user = userEvent.setup();
  const view = render(<ReadingDialog userId="u1" meterId="m1" meterName="Keller" meterType={type} onSuccess={onSuccess}>
    <button>Stand erfassen</button>
  </ReadingDialog>);
  await user.click(screen.getByText('Stand erfassen'));
  expect(screen.getByRole('dialog', { name: 'Zählerstand für Keller' })).toBeVisible();
  expect(screen.queryByText(/Keller ·/)).not.toBeInTheDocument();
  return { user, onSuccess, view, value: screen.getByLabelText(`Neuer Zählerstand (${type === 'gas' ? 'm³' : 'kWh'})`) };
}

describe('ReadingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks(); sessionStorage.clear();
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    rpc.mockImplementation((_name, args) => { insert(args.p_payload); return single(); });
    insert.mockReturnValue({ select: () => ({ single }) });
    single.mockResolvedValue({ data: { id: 'r1', meter_id: 'm1', date: localToday(), value: 100, created_at: 'now' }, error: null });
  });

  it.each([
    ['electricity', 24681.7, '24.681,7'],
    ['gas', 8412.365123, '8.412,365123'],
    ['electricity', 0, '0'],
  ] as const)('prefills %s with the last recorded value %s without marking it as an edit', async (type, previous, formatted) => {
    const user = userEvent.setup();
    render(<ReadingDialog userId="u1" meterId="prefill" meterName="Keller" meterType={type} lastReadingValue={previous}>
      <button>Stand erfassen</button>
    </ReadingDialog>);
    await user.click(screen.getByText('Stand erfassen'));
    const input = screen.getByLabelText(`Neuer Zählerstand (${type === 'gas' ? 'm³' : 'kWh'})`);
    expect(input).toHaveValue(formatted);
    expect(screen.queryByText(/Zuletzt/)).not.toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
    await user.click(screen.getByText('Abbrechen'));
    expect(screen.queryByText('Eingaben verwerfen?')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('Stand erfassen'));
    await user.clear(screen.getByLabelText(`Neuer Zählerstand (${type === 'gas' ? 'm³' : 'kWh'})`));
    await user.click(screen.getByText('Abbrechen'));
    expect(await screen.findByText('Eingaben verwerfen?')).toBeVisible();
  });

  it('blocks future dates and associates the message with the field', async () => {
    const { user, value } = await open();
    fireEvent.change(screen.getByLabelText('Ablesedatum'), { target: { value: '2999-01-01' } });
    await user.type(value, '123');
    await user.click(screen.getByText('Zählerstand speichern'));
    expect(await screen.findByText('Das Ablesedatum darf nicht in der Zukunft liegen.')).toBeVisible();
    expect(screen.getByLabelText('Ablesedatum')).toHaveAccessibleDescription('Das Ablesedatum darf nicht in der Zukunft liegen.');
    expect(insert).not.toHaveBeenCalled();
  });

  it.each(['', '-1', '1.2', '1,2,3'])('rejects invalid input %s without writing', async input => {
    const { user, value } = await open();
    if (input) await user.type(value, input);
    await user.click(screen.getByText('Zählerstand speichern'));
    await waitFor(() => expect(value).toHaveAttribute('aria-invalid', 'true'));
    expect(value).toHaveFocus();
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([['electricity', '24.681,7', 24681.7], ['gas', '8.412,365', 8412.365]] as const)(
    'saves %s independently, closes and returns focus', async (type, input, numeric) => {
      const { user, value, onSuccess } = await open(type);
      expect(screen.getByLabelText('Ablesedatum')).toHaveValue(localToday());
      await user.type(value, input);
      await user.click(screen.getByText('Zählerstand speichern'));
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
      expect(insert).toHaveBeenCalledWith({ meter_id: 'm1', date: localToday(), value: numeric });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Stand erfassen')).toHaveFocus();
    });

  it('keeps values after a failed request and permits retry', async () => {
    single.mockRejectedValueOnce(new Error('offline'));
    const { user, value, onSuccess } = await open('gas');
    await user.type(value, '8.412,365');
    await user.click(screen.getByText('Zählerstand speichern'));
    expect(await screen.findByRole('alert')).toHaveTextContent('erneut speichern');
    expect(value).toHaveValue('8.412,365');
    expect(onSuccess).not.toHaveBeenCalled();
    await user.click(screen.getByText('Erneut speichern'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('locks the submitted snapshot and prevents repeated submissions and closing while saving', async () => {
    let resolve!: (value: unknown) => void;
    single.mockReturnValue(new Promise(done => { resolve = done; }));
    const { user, value } = await open();
    await user.type(value, '123,45');
    await user.click(screen.getByText('Zählerstand speichern'));
    expect(value).toHaveAttribute('readonly');
    fireEvent.change(value, { target: { value: '999' } });
    await user.keyboard('{Escape}');
    fireEvent.submit(value.closest('form')!);
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByText('Abbrechen')).toBeDisabled();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ value: 123.45 }));
    resolve({ data: { id: 'r1', meter_id: 'm1', date: localToday(), value: 123.45 }, error: null });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each(['Abbrechen', 'Escape'])('protects changed inputs on %s and allows continuing or discarding', async method => {
    const { user, value } = await open();
    await user.type(value, '12,3');
    if (method === 'Escape') await user.keyboard('{Escape}');
    else await user.click(screen.getByText('Abbrechen'));
    await screen.findByText('Eingaben verwerfen?');
    await user.click(screen.getByText('Weiter erfassen'));
    await waitFor(() => expect(screen.queryByText('Eingaben verwerfen?')).not.toBeInTheDocument());
    expect(value).toHaveValue('12,3');
    await user.click(screen.getByText('Abbrechen'));
    await user.click(screen.getByText('Eingaben verwerfen'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(insert).not.toHaveBeenCalled();
    await user.click(screen.getByText('Stand erfassen'));
    expect(screen.getByLabelText('Neuer Zählerstand (kWh)')).toHaveValue('');
  });

  it('dismisses unchanged inputs with Escape', async () => {
    const { user } = await open();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('restores the identical locked reading request after remount and never changes its UUID', async () => {
    single.mockRejectedValueOnce(new Error('Lost committed response'));
    const first = await open();
    await first.user.type(first.value, '123,45');
    await first.user.click(screen.getByText('Zählerstand speichern'));
    await screen.findByRole('alert');
    const original = rpc.mock.calls[0];
    expect(original[0]).toBe('record_reading');
    expect(first.value).toHaveAttribute('readonly');
    first.view.unmount();
    const second = await open();
    expect(second.value).toHaveValue('123,45');
    expect(second.value).toHaveAttribute('readonly');
    await second.user.click(screen.getByText('Erneut speichern'));
    await waitFor(() => expect(second.onSuccess).toHaveBeenCalledOnce());
    expect(rpc.mock.calls[1]).toEqual(original);
    expect(sessionStorage.getItem('parity:reading:u1:m1')).toBeNull();
  });

  it('sends nothing when the request cannot be persisted', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      const { user, value } = await open();
      await user.type(value, '123');
      await user.click(screen.getByText('Zählerstand speichern'));
      expect(await screen.findByRole('alert')).toHaveTextContent('Es wurde nichts gesendet');
      expect(rpc).not.toHaveBeenCalled();
      expect(value).not.toHaveAttribute('readonly');
    } finally { spy.mockRestore(); }
  });

  it("does not restore another account's unconfirmed request", async () => {
    single.mockRejectedValueOnce(new Error('offline'));
    const first = await open();
    await first.user.type(first.value, '123');
    await first.user.click(screen.getByText('Zählerstand speichern'));
    await screen.findByRole('alert'); first.view.unmount();
    render(<ReadingDialog userId="u2" meterId="m1"><button>Anderes Konto</button></ReadingDialog>);
    await userEvent.click(screen.getByText('Anderes Konto'));
    expect(screen.getByLabelText('Neuer Zählerstand (kWh)')).toHaveValue('');
    expect(screen.queryByText('Erneut speichern')).not.toBeInTheDocument();
  });

  it('retains the original account request and sends nothing after a session change', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });
    const { user, value } = await open();
    await user.type(value, '123');
    await user.click(screen.getByText('Zählerstand speichern'));
    await screen.findByRole('alert');
    expect(rpc).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('parity:reading:u1:m1')).not.toBeNull();
  });

  it('never turns a deleted-result replay into a new insert on an ordinary retry', async () => {
    single.mockResolvedValueOnce({ data: null, error: { code: '22023', message: 'Ablesung wurde gelöscht' } });
    const { user, value } = await open();
    await user.type(value, '123');
    await user.click(screen.getByText('Zählerstand speichern'));
    await screen.findByRole('alert');
    expect(value).toHaveAttribute('readonly');
    await user.click(screen.getByText('Angaben neu prüfen'));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(value).not.toHaveAttribute('readonly');
    await user.click(screen.getByText('Zählerstand speichern'));
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    expect(rpc.mock.calls[1][1].p_request_id).not.toBe(rpc.mock.calls[0][1].p_request_id);
  });

});
