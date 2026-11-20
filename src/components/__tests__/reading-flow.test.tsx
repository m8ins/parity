vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../dashboard';
import { readingFixture } from '@/lib/reading-fixture';
import { loadMeterData } from '@/lib/contracts';
import type { Reading } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from, rpc, auth: { getUser: async () => ({ data: { user: { id: readingFixture.initialMeters[0].user_id } }, error: null }) } }) }));

describe('meter reading flow (synthetic data adapter, not a database acceptance)', () => {
  it.each([0, 1])('writes only meter %s, displays the returned reading and reloads through the existing loader', async index => {
    sessionStorage.clear();
    const store = structuredClone(readingFixture.initialData);
    const meter = readingFixture.initialMeters[index];
    from.mockImplementation((table: string) => ({
      select: () => ({ eq: (_column: string, id: string) => ({ order: async () => ({ data: table === 'readings' ? store[id].readings : [], error: null }) }) }),
    }));
    rpc.mockImplementation(async (_name: string, args: { p_payload: Pick<Reading, 'meter_id' | 'date' | 'value'> }) => {
      const reading = { ...args.p_payload, id: 'new-reading', created_at: '2026-11-15T12:00:00Z' };
      store[reading.meter_id].readings.push(reading);
      return { data: reading, error: null };
    });
    const user = userEvent.setup();
    const view = render(<Dashboard {...readingFixture} />);
    const target = () => document.querySelector(`[data-meter-id="${meter.id}"]`)! as HTMLElement;
    await user.click(within(target()).getByText('Stand erfassen'));
    const input = screen.getByLabelText(`Neuer Zählerstand (${index ? 'm³' : 'kWh'})`);
    await user.clear(input);
    await user.type(input, '99.999,123');
    await user.click(screen.getByText('Zählerstand speichern'));
    await waitFor(() => expect(within(target()).getByRole('status')).toHaveTextContent('Gespeichert: 99.999,123'));
    expect(within(target()).getByLabelText(/^Letzter Zählerstand/)).toHaveTextContent('99.999,123');
    const other = readingFixture.initialMeters[1 - index];
    expect(store[other.id].readings).toHaveLength(1);
    view.unmount();
    const loaded = await loadMeterData({ from } as unknown as SupabaseClient, meter.id);
    await act(async () => {
      render(<Dashboard {...readingFixture} initialData={{ ...store, [meter.id]: loaded }} />);
    });
    expect(within(target()).getByLabelText(/^Letzter Zählerstand/)).toHaveTextContent('99.999,123');
    expect(loaded.readings.at(-1)?.meter_id).toBe(meter.id);
  });
});
