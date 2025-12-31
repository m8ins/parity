import { describe, it, expect } from 'vitest';
import { formatDate } from './date-utils';

describe('formatDate', () => {
    it('formats a standard YYYY-MM-DD string correctly', () => {
        expect(formatDate('2025-12-24')).toBe('Dec 24, 2025');
        expect(formatDate('2024-01-01')).toBe('Jan 1, 2024');
    });

    it('formats single digit days correctly', () => {
        expect(formatDate('2025-12-05')).toBe('Dec 5, 2025');
    });

    it('handles invalid strings gracefully by returning them or a safe fallback', () => {
        // If not matching YYYY-MM-DD, it tries standard Date parsing
        // If completely invalid, it might return the string itself in our implementation
        expect(formatDate('invalid-date')).toBe('invalid-date');
    });

    it('handles empty strings', () => {
        expect(formatDate('')).toBe('-');
    });
});
