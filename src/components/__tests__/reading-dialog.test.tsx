import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadingDialog } from '../reading-dialog';

// Mock Next.js hooks
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: vi.fn(),
    }),
}));

// Mock Supabase Client
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: mockFrom
    })
}));

describe('ReadingDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({ insert: mockInsert });
        mockInsert.mockResolvedValue({ error: null });
    });

    it('validates strictly future dates', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();

        render(
            <ReadingDialog contractId="c1" onSuccess={onSuccess}>
                <button>Open Dialog</button>
            </ReadingDialog>
        );

        // Open dialog
        await user.click(screen.getByText('Open Dialog'));

        // Calculate tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Fill form with future date
        const dateInput = screen.getByLabelText('Date');
        await user.clear(dateInput);
        await user.type(dateInput, tomorrowStr);

        const valueInput = screen.getByLabelText('Reading Value');
        await user.type(valueInput, '123');

        // Submit
        const submitBtn = screen.getByText('Save Reading');
        await user.click(submitBtn);

        // Check for error
        await waitFor(() => {
            expect(screen.getByText('Date cannot be in the future')).toBeInTheDocument();
            expect(mockInsert).not.toHaveBeenCalled();
        });
    });

    it('accepts today\'s date', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();

        render(
            <ReadingDialog contractId="c1" onSuccess={onSuccess}>
                <button>Open Dialog</button>
            </ReadingDialog>
        );

        // Open dialog
        await user.click(screen.getByText('Open Dialog'));

        // Date defaults to today, but let's be explicit
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const dateInput = screen.getByLabelText('Date');
        // Ensure it has today's date (default)
        expect(dateInput).toHaveValue(todayStr);

        const valueInput = screen.getByLabelText('Reading Value');
        await user.type(valueInput, '100');

        // Submit
        const submitBtn = screen.getByText('Save Reading');
        await user.click(submitBtn);

        // Check success
        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                contract_id: 'c1',
                date: todayStr,
                value: 100
            }));
            expect(onSuccess).toHaveBeenCalled();
        });
    });
});
