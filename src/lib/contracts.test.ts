import { describe, it, expect } from 'vitest';
import {
  addOneYear,
  formatPeriodLabel,
} from './contracts';
import type { Contract } from './types';

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
      period_end: undefined, // unknown end stays open
      provider: undefined,
    });
    expect(formatPeriodLabel(c)).toBe('Oct 2025 – open');
  });
});
