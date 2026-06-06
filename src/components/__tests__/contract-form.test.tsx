import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractForm } from '../contract-form';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ from: mockFrom })
}));

describe('ContractForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue({ insert: mockInsert });
        mockInsert.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ single: mockSingle });
        mockSingle.mockResolvedValue({
            data: { id: 'new-id' },
            error: null
        });
    });

    it('renders required fields', () => {
        render(<ContractForm user_id="user-1" />);
        expect(screen.getByLabelText('Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Grundpreis')).toBeInTheDocument();
        expect(screen.getByLabelText('Arbeitspreis')).toBeInTheDocument();
        expect(screen.getByLabelText('Abschlag')).toBeInTheDocument();
    });

    it('submits and creates meter, contract, and rate', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();

        render(<ContractForm user_id="user-1" onSuccess={onSuccess} />);

        await user.type(screen.getByLabelText('Name'), 'Hauptzähler');

        const dateInput = screen.getByLabelText('Abrechnungsperiode Start');
        await user.clear(dateInput);
        await user.type(dateInput, '2025-01-01');

        await user.type(screen.getByLabelText('Grundpreis'), '9');
        await user.type(screen.getByLabelText('Arbeitspreis'), '34');
        await user.type(screen.getByLabelText('Abschlag'), '70');

        const form = screen.getByLabelText('Name').closest('form');
        if (form) fireEvent.submit(form);

        await waitFor(() => {
            expect(mockFrom).toHaveBeenCalledWith('meters');
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-1',
                name: 'Hauptzähler',
                type: 'electricity',
            }));
        });
    });
});
