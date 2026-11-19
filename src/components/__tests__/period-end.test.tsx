import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeriodEndDialog } from '../PeriodEndDialog';
import { ContractDetail } from '../contract-detail';
import { understandingFixture } from '@/lib/understanding-fixture';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), back: vi.fn() }) }));
vi.mock('../contract-chart', () => ({ ContractChart: () => <div>Diagramm</div> }));
const fixture = understandingFixture('gas');
const period = { ...fixture.data.contracts[0], period_start: '2025-11-01', period_end: undefined };
const onSaved = vi.fn(), onClose = vi.fn();
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
describe('billing period end', () => {
  it('shows a truly open period with an obvious end action and permits a future condition', async () => {
    render(<ContractDetail initialMeter={fixture.meter} initialData={{ ...fixture.data, contracts: [period] }} asOf="2026-11-16" />);
    expect(screen.getByText('(ab 01.11.2025 · offen)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ende festlegen' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Konditionen' }));
    expect(screen.getByRole('heading', { name: 'Aktuell gültig' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Konditionen ändern' }));
    expect(screen.getByLabelText('Gültig ab')).toHaveValue('2026-11-16');
    expect(screen.getByLabelText('Gültig ab')).not.toHaveAttribute('max');
    const input = screen.getByLabelText('Abschlag'); await userEvent.clear(input); await userEvent.type(input, '115');
    await userEvent.click(screen.getByRole('button', { name: 'Änderung prüfen' }));
    expect(screen.getByRole('heading', { name: /Neue Konditionen ab/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Neue Konditionen speichern' })).toBeInTheDocument();
    expect(screen.queryByText(/vergangenen oder abgerechneten/)).not.toBeInTheDocument();
  });
  it('stores the next boundary for the inclusive day and uses only a confirmed result', async () => {
    rpc.mockResolvedValue({ data: { ...period, period_end: '2026-11-01' }, error: null });
    render(<PeriodEndDialog period={period} open onSaved={onSaved} onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Bis einschließlich (optional)'), '2026-10-31');
    await userEvent.click(screen.getByRole('button', { name: 'Zeitraumende speichern' }));
    expect(rpc).toHaveBeenCalledWith('set_billing_period_end', { p_period_id: period.id, p_expected_start: '2025-11-01', p_expected_end: null, p_end: '2026-11-01' });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ period_end: '2026-11-01' }));
  });
  it('preserves failed input and retries the same absolute change without reporting success', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'lost' } }).mockResolvedValueOnce({ data: { ...period, period_end: '2027-01-01' } });
    render(<PeriodEndDialog period={period} open onSaved={onSaved} onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Bis einschließlich (optional)'), '2026-12-31');
    await userEvent.click(screen.getByRole('button', { name: 'Zeitraumende speichern' }));
    expect(screen.getByRole('alert')).toBeInTheDocument(); expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Bis einschließlich (optional)')).toHaveValue('2026-12-31');
    await userEvent.click(screen.getByRole('button', { name: 'Zeitraumende speichern' }));
    expect(rpc.mock.calls[1]).toEqual(rpc.mock.calls[0]);
  });
  it('prevents duplicate sends and protects cancelling edited input', async () => {
    let finish!: (value: unknown) => void; rpc.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<PeriodEndDialog period={period} open onSaved={onSaved} onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Bis einschließlich (optional)'), '2026-12-31');
    await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Weiter bearbeiten' }));
    await userEvent.dblClick(screen.getByRole('button', { name: 'Zeitraumende speichern' }));
    expect(rpc).toHaveBeenCalledOnce(); await userEvent.keyboard('{Escape}'); expect(onClose).not.toHaveBeenCalled();
    finish({ data: { ...period, period_end: '2027-01-01' } }); await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });
});
