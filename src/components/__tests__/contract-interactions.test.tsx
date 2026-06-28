import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../dashboard';
import { ContractDetail } from '../contract-detail';
import type { Meter, Contract, Rate, MeterData } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockSingle = vi.fn();
const mockLimit = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ from: mockFrom })
}));

describe('Meter Interactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockFrom.mockReturnValue({
            select: mockSelect,
            delete: mockDelete,
            update: mockUpdate
        });
        mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
        mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, limit: mockLimit });
        mockLimit.mockReturnValue({ single: mockSingle });
        mockOrder.mockResolvedValue({ data: [], error: null });
        mockDelete.mockReturnValue({ eq: mockEq });
        mockUpdate.mockReturnValue({ eq: mockEq });
        mockSingle.mockResolvedValue({ data: null, error: null });
    });

    describe('Dashboard', () => {
        it('renders meter cards', async () => {
            const initialMeters: Meter[] = [{
                id: 'm1',
                user_id: 'u1',
                name: 'Hauptzähler Strom',
                type: 'electricity',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            }];
            const initialData: Record<string, MeterData> = {
                m1: { contracts: [], ratesByContract: {}, readings: [] }
            };

            render(
                <Dashboard
                    user={{ id: 'u1' } as User}
                    initialMeters={initialMeters}
                    initialData={initialData}
                />
            );

            await screen.findByText('Hauptzähler Strom');
        });
    });

    describe('Meter Detail', () => {
        it('renders meter name and type', async () => {
            const meter: Meter = {
                id: 'm1',
                user_id: 'u1',
                name: 'Gas Zähler',
                type: 'gas',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            const contract: Contract = {
                id: 'c1',
                meter_id: 'm1',
                period_start: '2024-01-01',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            const rate: Rate = {
                id: 'r1',
                contract_id: 'c1',
                effective_from: '2024-01-01',
                grundpreis: 9.90,
                arbeitspreis: 9.33,
                abschlag: 109,
                umrechnungsfaktor: 10,
                created_at: '2024-01-01T00:00:00Z'
            };

            render(
                <ContractDetail
                    initialMeter={meter}
                    initialData={{
                        contracts: [contract],
                        ratesByContract: { c1: [rate] },
                        readings: [],
                    }}
                />
            );

            await screen.findByText('Gas Zähler');
            expect(screen.getByText('Gas')).toBeInTheDocument();
        });
    });
});
