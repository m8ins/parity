import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../header';
import { AccountBoundary } from '../AccountBoundary';
const api = vi.hoisted(() => ({ signOut: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: api }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: api.refresh }), usePathname: () => '/' }));
beforeEach(() => {
  vi.clearAllMocks(); api.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', email: 'demo@example.test' } } } });
  api.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
describe('Konto und Sitzung', () => {
  it('sperrt eine zweite Abmeldung während Pending', async () => {
    let finish!: (value: { error: null }) => void;
    api.signOut.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const user = userEvent.setup(); render(<Header />);
    await user.click(await screen.findByRole('button', { name: 'Konto öffnen' }));
    await user.click(screen.getByRole('menuitem', { name: 'Abmelden' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Wird abgemeldet');
    await user.click(screen.getByRole('button', { name: 'Konto öffnen' }));
    expect(screen.getByRole('menuitem', { name: 'Wird abgemeldet …' })).toHaveAttribute('aria-disabled', 'true');
    expect(api.signOut).toHaveBeenCalledOnce(); expect(api.refresh).not.toHaveBeenCalled();
    await act(async () => finish({ error: null })); expect(screen.queryByRole('button', { name: 'Konto öffnen' })).toBeNull();
  });
  it('verursacht bei unbekannter Server-Sitzung nach Abruffehler keine Neuladeschleife', () => {
    render(<AccountBoundary initialUserId={undefined}><p>Daten konnten nicht geladen werden</p></AccountBoundary>);
    expect(screen.queryByText('Daten konnten nicht geladen werden')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Sitzung konnte nicht geprüft werden' })).toBeVisible();
    expect(api.getSession).not.toHaveBeenCalled();
    expect(api.onAuthStateChange).not.toHaveBeenCalled();
  });
  it('meldet fehlgeschlagene Abmeldung, sperrt Wiederholung während Pending und aktualisiert erst nach Erfolg', async () => {
    api.signOut.mockResolvedValueOnce({ error: { message: 'offline' } }).mockResolvedValueOnce({ error: null });
    const user = userEvent.setup(); render(<Header />);
    await user.click(await screen.findByRole('button', { name: 'Konto öffnen' })); await user.click(screen.getByRole('menuitem', { name: 'Abmelden' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('nicht bestätigt'); expect(api.refresh).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Abmelden erneut versuchen' })); expect(screen.queryByRole('button', { name: 'Konto öffnen' })).toBeNull();
  });
  it.each([null, 'u2'])('entfernt alte Formulare sofort bei Kontowechsel zu %s und bewahrt gesicherte Aufträge', async id => {
    sessionStorage.setItem('parity:pending:u1', 'saved-request');
    render(<AccountBoundary initialUserId="u1"><p>Alte Kontodaten</p><input defaultValue="alter Entwurf" /></AccountBoundary>);
    const callback = api.onAuthStateChange.mock.calls[0][0];
    await act(async () => callback('SIGNED_OUT', id ? { user: { id } } : null));
    expect(screen.queryByText('Alte Kontodaten')).toBeNull(); expect(screen.queryByDisplayValue('alter Entwurf')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Sitzung hat sich geändert'); expect(sessionStorage.getItem('parity:pending:u1')).toBe('saved-request');
  });
});
