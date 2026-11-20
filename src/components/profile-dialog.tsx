'use client';

import { useRef, useState } from 'react';
import { isMissingSession } from '@/lib/access';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Settings } from 'lucide-react';

export function ProfileDialog({ open: controlledOpen, onOpenChange: setControlledOpen, showTrigger = true }: { open?: boolean; onOpenChange?: (open: boolean) => void; showTrigger?: boolean }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = setControlledOpen ?? setInternalOpen;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const supabase = createClient();

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    setMessage(''); setError('');
    if (password !== confirmPassword) { setError('Die Passwörter stimmen nicht überein. Bitte prüfe beide Eingaben.'); return; }
    if (password.length < 6) { setError('Das Passwort muss mindestens 6 Zeichen lang sein.'); return; }
    busy.current = true; setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) setError(isMissingSession(updateError) ? 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an und versuche es dann noch einmal.' : 'Das Passwort konnte nicht geändert werden. Bitte versuche es erneut.');
      else { setMessage('Dein Passwort wurde geändert.'); setPassword(''); setConfirmPassword(''); }
    } catch { setError('Keine Verbindung möglich. Bitte versuche es erneut.'); }
    finally { busy.current = false; setLoading(false); }
  };
  const changeOpen = (value: boolean) => {
    if (busy.current) return;
    if (!value) { setPassword(''); setConfirmPassword(''); setError(''); setMessage(''); }
    onOpenChange(value);
  };
  return <Dialog open={open} onOpenChange={changeOpen}>
    {showTrigger && <DialogTrigger asChild><Button variant="ghost" size="icon" aria-label="Konto öffnen"><Settings /></Button></DialogTrigger>}
    <DialogContent showCloseButton={!loading} onEscapeKeyDown={event => { if (busy.current) event.preventDefault(); }} onPointerDownOutside={event => { if (busy.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Passwort ändern</DialogTitle><DialogDescription>Ändere das Passwort für dein Parity-Konto.</DialogDescription></DialogHeader>
      <form onSubmit={handleUpdatePassword} className="parity-form" aria-busy={loading}>
        <fieldset disabled={loading}>
          <div className="form-field"><Label htmlFor="new-password">Neues Passwort</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required aria-invalid={!!error} aria-describedby="password-help profile-error" /><p id="password-help" className="text-sm text-muted-foreground">Mindestens 6 Zeichen.</p></div>
          <div className="form-field"><Label htmlFor="confirm-password">Neues Passwort bestätigen</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required aria-invalid={!!error} aria-describedby={error ? 'profile-error' : undefined} /></div>
          {error && <p id="profile-error" className="form-error" role="alert">{error}</p>}
          <p className="form-success" role="status">{message}</p>
          <Button type="submit">{loading ? 'Wird geändert …' : 'Passwort ändern'}</Button>
          <Button type="button" variant="ghost" onClick={() => changeOpen(false)}>Schließen</Button>
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>;
}
