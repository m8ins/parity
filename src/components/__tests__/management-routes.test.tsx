import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeterPage from '@/app/meter/[id]/page';
import LegacyPage from '@/app/contract/[id]/page';
import Home from '@/app/page';
const api = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn(), from: vi.fn(), load: vi.fn(), redirect: vi.fn(), order: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: api.getUser }, from: api.from }) }));
vi.mock('@/lib/contracts', async original => ({ ...await original<object>(), loadMeterData: api.load }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), redirect: api.redirect }));
vi.mock('@/components/auth-screen', () => ({ AuthScreen: ({ notice }: { notice: string }) => <p>{notice}</p> }));
const id = '11111111-1111-4111-8111-111111111111';
const meter = { id, user_id: 'u1', name: 'Test', type: 'electricity' };
const page = (value = id, period?: string) => MeterPage({ params: Promise.resolve({ id: value }), searchParams: Promise.resolve({ period }) });
beforeEach(() => {
  vi.clearAllMocks(); api.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  api.maybeSingle.mockResolvedValue({ data: meter, error: null });
  api.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: api.maybeSingle }), order: api.order }) });
  api.load.mockResolvedValue({ contracts: [], readings: [], ratesByContract: {} });
});
describe('Direkte Links und Abrufzustände', () => {
  it('fordert bei fehlender Sitzung Anmeldung im ursprünglichen Link an', async () => {
    api.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthSessionMissingError' } });
    render(await page()); expect(screen.getByText(/Sitzung fehlt oder ist abgelaufen/)).toBeVisible(); expect(api.from).not.toHaveBeenCalled();
  });
  it('behandelt einen Auth-Netzwerkfehler als Abruffehler', async () => {
    const error = { status: 0, message: 'offline' }; api.getUser.mockResolvedValue({ data: { user: null }, error });
    await expect(page()).rejects.toEqual(error);
  });
  it.each(['ungueltig', id])('zeigt für ungültige oder unzugängliche IDs %s denselben Rückweg', async value => {
    api.maybeSingle.mockResolvedValue({ data: null, error: null });
    render(await page(value)); expect(screen.getByRole('heading', { name: 'Zähler nicht verfügbar' })).toBeVisible(); expect(screen.getByRole('link')).toHaveAttribute('href', '/');
    expect(api.load).not.toHaveBeenCalled();
  });
  it('unterscheidet Queryfehler vom tatsächlich fehlenden Zähler', async () => {
    const error = { message: 'network' }; api.maybeSingle.mockResolvedValue({ data: null, error }); await expect(page()).rejects.toEqual(error);
  });
  it.each(['falsch', '22222222-2222-4222-8222-222222222222', ''])('ersetzt Zeitraum %s nicht durch einen anderen', async period => {
    render(await page(id, period)); expect(screen.getByRole('heading', { name: 'Zeitraum nicht verfügbar' })).toBeVisible(); expect(screen.getByRole('link')).toHaveAttribute('href', `/meter/${id}`);
  });
  it('gibt einen Historienfehler an die Wiederladeansicht weiter', async () => {
    api.load.mockRejectedValue(new Error('rates offline')); await expect(page()).rejects.toThrow('rates offline');
  });
  it('leitet Legacy-Zeitraum über den tatsächlich zugehörigen Zähler weiter', async () => {
    const period = '22222222-2222-4222-8222-222222222222'; api.maybeSingle.mockResolvedValue({ data: { id: period, meter_id: id }, error: null });
    await LegacyPage({ params: Promise.resolve({ id: period }) }); expect(api.redirect).toHaveBeenCalledWith(`/meter/${id}?period=${period}`);
  });
  it('nennt einen fehlgeschlagenen Übersichtsabruf niemals leere Übersicht', async () => {
    api.order.mockResolvedValue({ data: null, error: { message: 'offline' } }); await expect(Home()).rejects.toEqual({ message: 'offline' });
  });
});
