import { describe, expect, it } from 'vitest';
import { readingSchema, formatReading, latestReading } from './readings';

describe('reading domain and German presentation', () => {
  it('preserves zero, historic lower readings and existing decimal precision', () => {
    for (const [input, value] of [['0', 0], ['1,234567', 1.234567], ['999.999,999', 999999.999]] as const) {
      expect(readingSchema.parse({ date: '2025-01-01', value: input }).value).toBe(value);
    }
  });
  it('rejects impossible calendar dates', () => {
    expect(readingSchema.safeParse({ date: '2025-02-30', value: '1' }).success).toBe(false);
  });
  it('formats precision without changing the saved value', () => {
    expect(formatReading(24681.7)).toBe('24.681,7');
    expect(formatReading(8412.365)).toBe('8.412,365');
    expect(formatReading(1.234567)).toBe('1,234567');
  });
  it('chooses by reading date, then creation time rather than arrival order', () => {
    const readings = [
      { id: 'new', meter_id: 'gas', date: '2026-11-15', value: 12, created_at: '2026-11-15T12:00:00Z' },
      { id: 'old', meter_id: 'gas', date: '2026-11-01', value: 10, created_at: '2026-11-16T12:00:00Z' },
    ];
    expect(latestReading(readings)?.id).toBe('new');
  });
});
