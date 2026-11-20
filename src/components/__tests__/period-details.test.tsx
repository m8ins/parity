import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractDetail } from '../contract-detail';
import { understandingFixture } from '@/lib/understanding-fixture';

const { rpc, refresh } = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc }) }));

const fixture = understandingFixture('electricity');
const period = fixture.data.contracts[0];
async function edit() {
  const user = userEvent.setup();
  render(<ContractDetail initialMeter={fixture.meter} initialData={fixture.data} />);
  await user.click(screen.getByRole('tab', { name: 'Verwalten' }));
  await user.click(screen.getByRole('button', { name: 'Details bearbeiten' }));
  await user.clear(screen.getByLabelText('Anbieter', { exact: true }));
  await user.type(screen.getByLabelText('Anbieter', { exact: true }), 'Neuer Anbieter');
  return user;
}
describe('Period details writes', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('confirms the server row through the account-checked RPC with an expected snapshot', async () => {
    rpc.mockResolvedValue({ data: { ...period, provider: 'Neuer Anbieter' }, error: null });
    const user = await edit();
    await user.click(screen.getByRole('button', { name: 'Details speichern' }));
    expect(rpc).toHaveBeenCalledWith('save_billing_period_details', {
      p_period_id: period.id,
      p_expected: { period_start: period.period_start, period_end: period.period_end ?? null, provider: period.provider ?? null },
      p_start: period.period_start, p_provider: 'Neuer Anbieter',
    });
    expect(await screen.findByText('Neuer Anbieter', { exact: true })).toBeVisible();
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('keeps edits after a conflict and retries the same absolute target and snapshot', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: '40001' } }).mockResolvedValueOnce({ data: { ...period, provider: 'Neuer Anbieter' }, error: null });
    const user = await edit();
    await user.click(screen.getByRole('button', { name: 'Details speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Zeitraum wurde inzwischen geändert');
    expect(screen.getByLabelText('Anbieter', { exact: true })).toHaveValue('Neuer Anbieter');
    expect(refresh).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Details speichern' }));
    expect(rpc.mock.calls[1]).toEqual(rpc.mock.calls[0]);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('keeps an unavailable-RPC error beside the form and hides it on other tabs', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    const user = await edit();
    await user.click(screen.getByRole('button', { name: 'Details speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Speicherung ist derzeit nicht verfügbar');
    expect(screen.getByLabelText('Anbieter', { exact: true })).toHaveValue('Neuer Anbieter');
    await user.click(screen.getByRole('tab', { name: 'Verstehen' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

});
