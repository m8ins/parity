import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  addOneYear,
  formatPeriodLabel,
  rolloverContract,
} from './contracts';
import type { Contract, Rate } from './types';

const baseContract = (overrides?: Partial<Contract>): Contract => ({
  id: 'c1',
  meter_id: 'm1',
  period_start: '2024-01-01',
  period_end: '2025-01-01',
  provider: 'e.on',
  created_at: 'now',
  updated_at: 'now',
  ...overrides,
});

const baseRate = (overrides?: Partial<Rate>): Rate => ({
  id: 'r1',
  contract_id: 'c1',
  effective_from: '2024-01-01',
  grundpreis: 12,
  arbeitspreis: 30,
  abschlag: 100,
  umrechnungsfaktor: 10,
  created_at: 'now',
  ...overrides,
});

interface RecordedCall {
  table: string;
  vals: Record<string, unknown>;
}

/** Minimal Supabase stub that records update/insert calls. */
function makeSupabase() {
  const calls: { updates: RecordedCall[]; inserts: RecordedCall[] } = {
    updates: [],
    inserts: [],
  };
  const client = {
    from(table: string) {
      return {
        update(vals: Record<string, unknown>) {
          return {
            eq() {
              calls.updates.push({ table, vals });
              return Promise.resolve({ error: null });
            },
          };
        },
        insert(vals: Record<string, unknown>) {
          calls.inserts.push({ table, vals });
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: { id: `${table}-new`, ...vals },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('addOneYear', () => {
  it('adds a year, preserving month and day', () => {
    expect(addOneYear('2024-01-01')).toBe('2025-01-01');
    expect(addOneYear('2024-07-15')).toBe('2025-07-15');
  });
});

describe('formatPeriodLabel', () => {
  it('shows the month range and provider', () => {
    // 2024-01-01 .. 2025-01-01 (exclusive) → Jan–Dec 2024.
    expect(formatPeriodLabel(baseContract())).toBe('Jan 2024 – Dec 2024 · e.on');
  });
  it('omits the provider when not set', () => {
    expect(formatPeriodLabel(baseContract({ provider: undefined }))).toBe(
      'Jan 2024 – Dec 2024',
    );
  });
  it('spans into the next calendar year for a mid-year start', () => {
    const c = baseContract({
      period_start: '2025-10-18',
      period_end: undefined, // derives +1 year → 2026-10-18
      provider: undefined,
    });
    expect(formatPeriodLabel(c)).toBe('Oct 2025 – Oct 2026');
  });
});

describe('rolloverContract', () => {
  it('starts the next period at period_end and carries over rate + provider', async () => {
    const { client, calls } = makeSupabase();
    const result = await rolloverContract(client, baseContract(), baseRate());

    const contractInsert = calls.inserts.find((i) => i.table === 'contracts');
    expect(contractInsert!.vals.period_start).toBe('2025-01-01');
    expect(contractInsert!.vals.period_end).toBe('2026-01-01');
    expect(contractInsert!.vals.provider).toBe('e.on');

    const rateInsert = calls.inserts.find((i) => i.table === 'rates');
    expect(rateInsert!.vals.contract_id).toBe('contracts-new');
    expect(rateInsert!.vals.abschlag).toBe(100);
    expect(rateInsert!.vals.arbeitspreis).toBe(30);
    expect(rateInsert!.vals.effective_from).toBe('2025-01-01');

    expect(result.contract.id).toBe('contracts-new');
    expect(result.rate?.id).toBe('rates-new');
  });

  it('applies overrides (provider switch + new abschlag)', async () => {
    const { client, calls } = makeSupabase();
    await rolloverContract(client, baseContract(), baseRate(), {
      provider: 'Vattenfall',
      abschlag: 130,
    });

    const contractInsert = calls.inserts.find((i) => i.table === 'contracts');
    expect(contractInsert!.vals.provider).toBe('Vattenfall');
    const rateInsert = calls.inserts.find((i) => i.table === 'rates');
    expect(rateInsert!.vals.abschlag).toBe(130);
  });

  it('closes an open-ended previous period at the new start', async () => {
    const { client, calls } = makeSupabase();
    const open = baseContract({ period_end: undefined });
    await rolloverContract(client, open, baseRate());

    // new start derived as period_start + 1 year
    const contractInsert = calls.inserts.find((i) => i.table === 'contracts');
    expect(contractInsert!.vals.period_start).toBe('2025-01-01');

    const close = calls.updates.find((u) => u.table === 'contracts');
    expect(close).toBeDefined();
    expect(close!.vals.period_end).toBe('2025-01-01');
  });

  it('truncates the previous period for a mid-year switch', async () => {
    const { client, calls } = makeSupabase();
    // Current year runs 2024-01-01 .. 2025-01-01, switch to Vattenfall mid-year.
    await rolloverContract(client, baseContract(), baseRate(), {
      period_start: '2024-07-15',
      provider: 'Vattenfall',
    });

    // Previous period shortened to the switch date.
    const close = calls.updates.find((u) => u.table === 'contracts');
    expect(close).toBeDefined();
    expect(close!.vals.period_end).toBe('2024-07-15');

    // New period starts at the switch date and runs a year.
    const contractInsert = calls.inserts.find((i) => i.table === 'contracts');
    expect(contractInsert!.vals.period_start).toBe('2024-07-15');
    expect(contractInsert!.vals.period_end).toBe('2025-07-15');
    expect(contractInsert!.vals.provider).toBe('Vattenfall');
  });

  it('does not truncate the previous period on a regular rollover', async () => {
    const { client, calls } = makeSupabase();
    await rolloverContract(client, baseContract(), baseRate());
    // newStart equals the existing period_end → no update needed.
    expect(calls.updates.some((u) => u.table === 'contracts')).toBe(false);
  });

  it('rejects a new start that is not after the current period start', async () => {
    const { client } = makeSupabase();
    await expect(
      rolloverContract(client, baseContract(), baseRate(), {
        period_start: '2023-12-01',
      }),
    ).rejects.toThrow(/must be after/);
  });

  it('does not insert a rate when there is no previous rate', async () => {
    const { client, calls } = makeSupabase();
    const result = await rolloverContract(client, baseContract(), null);

    expect(calls.inserts.some((i) => i.table === 'rates')).toBe(false);
    expect(result.rate).toBeNull();
  });
});
