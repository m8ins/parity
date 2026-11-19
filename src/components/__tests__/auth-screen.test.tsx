import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthScreen } from '../auth-screen';
import { ProfileDialog } from '../profile-dialog';

const auth = vi.hoisted(() => ({ signInWithOtp: vi.fn(), verifyOtp: vi.fn(), signInWithPassword: vi.fn(), updateUser: vi.fn() }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
beforeEach(() => { vi.resetAllMocks(); Object.values(auth).forEach(method => method.mockResolvedValue({ error: null })); });

describe('Bestehende Anmeldewege', () => {
  it('fordert einen Code an und bestätigt ihn mit derselben E-Mail', async () => {
    const user = userEvent.setup(); render(<AuthScreen />);
    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'demo@parity.example');
    await user.click(screen.getByRole('button', { name: 'Code anfordern' }));
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'demo@parity.example', options: { emailRedirectTo: window.location.origin } });
    await user.type(await screen.findByLabelText('Anmeldecode'), '123456');
    await user.click(screen.getByRole('button', { name: 'Code bestätigen' }));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'demo@parity.example', token: '123456', type: 'email' });
    expect(screen.getByText('Angemeldet. Deine Zähler werden geladen …')).toBeVisible();
  });
  it('behält Passwort-Eingaben nach einem Fehler und erlaubt Wiederholen', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: { code: 'invalid_credentials', message: 'raw backend error' } });
    const user = userEvent.setup(); render(<AuthScreen />);
    await user.click(screen.getByRole('tab', { name: 'Passwort' }));
    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'demo@parity.example');
    await user.type(screen.getByLabelText('Passwort', { exact: true, selector: 'input' }), 'test-passwort');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Prüfe E-Mail-Adresse und Passwort');
    expect(screen.getByLabelText('Passwort', { exact: true, selector: 'input' })).toHaveValue('test-passwort');
    expect(screen.queryByText('raw backend error')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(2); expect(screen.getByText('Angemeldet. Deine Zähler werden geladen …')).toBeVisible();
  });
  it('sperrt Felder, Wechsel und Mehrfachübermittlung während der Anmeldung', async () => {
    let finish!: (value: { error: null }) => void;
    auth.signInWithOtp.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const user = userEvent.setup(); render(<AuthScreen />);
    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'demo@parity.example');
    await user.click(screen.getByRole('button', { name: 'Code anfordern' }));
    expect(screen.getByLabelText('E-Mail-Adresse')).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Passwort' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Bitte warten …' }));
    expect(auth.signInWithOtp).toHaveBeenCalledOnce();
    finish({ error: null }); await screen.findByLabelText('Anmeldecode');
  });
  it('zeigt bei Verbindungsfehler einen deutschen Wiederholhinweis', async () => {
    auth.signInWithOtp.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup(); render(<AuthScreen />);
    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'demo@parity.example');
    await user.click(screen.getByRole('button', { name: 'Code anfordern' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Keine Verbindung');
    expect(screen.getByLabelText('E-Mail-Adresse')).toHaveValue('demo@parity.example');
  });
});
describe('Profil', () => {
  it('prüft Passwortbestätigung und erhält Fehler bei fehlgeschlagener Speicherung', async () => {
    const user = userEvent.setup(); render(<ProfileDialog open />);
    await user.type(screen.getByLabelText('Neues Passwort', { exact: true }), 'test-passwort');
    await user.type(screen.getByLabelText('Neues Passwort bestätigen'), 'anders');
    await user.click(screen.getByRole('button', { name: 'Passwort ändern' }));
    expect(screen.getByRole('alert')).toHaveTextContent('stimmen nicht überein');
    expect(auth.updateUser).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Neues Passwort bestätigen'));
    await user.type(screen.getByLabelText('Neues Passwort bestätigen'), 'test-passwort');
    auth.updateUser.mockResolvedValueOnce({ error: { message: 'raw' } });
    await user.click(screen.getByRole('button', { name: 'Passwort ändern' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('konnte nicht geändert'));
    expect(screen.getByLabelText('Neues Passwort', { exact: true })).toHaveValue('test-passwort');
  });
});

describe('Sitzung und Formularabschluss', () => {
  it('fokussiert nach erfolgreicher Codeanforderung das Codefeld', async () => {
    const user = userEvent.setup(); render(<AuthScreen />);
    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'demo@parity.example');
    await user.click(screen.getByRole('button', { name: 'Code anfordern' }));
    expect(await screen.findByLabelText('Anmeldecode')).toHaveFocus();
  });
  it('erklärt eine abgelaufene Sitzung ohne Erfolg und erhält die Passworteingaben', async () => {
    auth.updateUser.mockResolvedValue({ error: { code: 'session_not_found', status: 400 } });
    const user = userEvent.setup(); render(<ProfileDialog open />);
    await user.type(screen.getByLabelText('Neues Passwort', { exact: true }), 'test-passwort');
    await user.type(screen.getByLabelText('Neues Passwort bestätigen'), 'test-passwort');
    await user.click(screen.getByRole('button', { name: 'Passwort ändern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sitzung ist abgelaufen');
    expect(screen.getByLabelText('Neues Passwort', { exact: true })).toHaveValue('test-passwort');
    expect(screen.queryByText('Dein Passwort wurde geändert.')).toBeNull();
  });
  it('entfernt Passwortentwürfe auch beim expliziten Schließen', async () => {
    const user = userEvent.setup(); render(<ProfileDialog />);
    await user.click(screen.getByRole('button', { name: 'Konto öffnen' }));
    await user.type(screen.getByLabelText('Neues Passwort', { exact: true }), 'alter-entwurf');
    await user.click(screen.getAllByRole('button', { name: 'Schließen' })[0]);
    await user.click(screen.getByRole('button', { name: 'Konto öffnen' }));
    expect(screen.getByLabelText('Neues Passwort', { exact: true })).toHaveValue('');
  });
});
