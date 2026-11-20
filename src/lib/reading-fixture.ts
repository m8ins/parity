import type { User } from '@supabase/supabase-js';
import type { Meter, MeterData } from './types';

// Fixed synthetic household. Only imported by the opt-in development preview
// and verification tests; never load a real account for screenshot work.
const created = '2026-10-15T12:00:00Z';
export const readingFixture = {
  user: { id: '10000000-0000-4000-8000-000000000001' } as User,
  initialMeters: [
    { id: '20000000-0000-4000-8000-000000000001', user_id: '10000000-0000-4000-8000-000000000001', name: 'Strom · Keller', type: 'electricity', created_at: created, updated_at: created },
    { id: '20000000-0000-4000-8000-000000000002', user_id: '10000000-0000-4000-8000-000000000001', name: 'Gas · Hauswirtschaft', type: 'gas', created_at: created, updated_at: created },
  ] as Meter[],
  initialData: {
    '20000000-0000-4000-8000-000000000001': { contracts: [], ratesByContract: {}, readings: [{ id: '30000000-0000-4000-8000-000000000001', meter_id: '20000000-0000-4000-8000-000000000001', date: '2026-10-15', value: 24398.2, created_at: created }] },
    '20000000-0000-4000-8000-000000000002': { contracts: [], ratesByContract: {}, readings: [{ id: '30000000-0000-4000-8000-000000000002', meter_id: '20000000-0000-4000-8000-000000000002', date: '2026-10-15', value: 8412.365, created_at: created }] },
  } as Record<string, MeterData>,
};
