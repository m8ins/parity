'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { renameMeter, MeterManagementError } from '@/lib/meter-management';
import type { Meter } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function RenameMeterDialog({ meter, open, onOpenChange, onSaved, returnFocus }: { meter: Meter; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (meter: Meter) => void; returnFocus?: () => void }) {
  const [name, setName] = useState(meter.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    if (name.trim().length < 2) { setError('Bitte einen Namen mit mindestens 2 Zeichen eingeben.'); input.current?.focus(); return; }
    busy.current = true; setPending(true); setError('');
    try { const saved = await renameMeter(createClient(), meter, name); onSaved(saved); onOpenChange(false); }
    catch (cause) { setError(cause instanceof MeterManagementError ? cause.message : 'Der Name konnte nicht gespeichert werden. Bitte versuche es erneut.'); }
    finally { busy.current = false; setPending(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy.current) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending} onCloseAutoFocus={event => { if (returnFocus) { event.preventDefault();
        // A rapid next action may already have moved focus into another menu.
        if (document.activeElement === document.body || document.activeElement?.closest('[role="dialog"]')) returnFocus(); } }}>
      <DialogHeader><DialogTitle>Zähler umbenennen</DialogTitle><DialogDescription>Neuer Name für „{meter.name}“.</DialogDescription></DialogHeader>
      <form className="parity-form" onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending}>
          <div className="form-field"><Label htmlFor={`rename-${meter.id}`}>Zählername</Label><Input ref={input} id={`rename-${meter.id}`} value={name} onChange={event => setName(event.target.value)} aria-invalid={!!error} aria-describedby={error ? `rename-error-${meter.id}` : undefined} /></div>
          {error && <p id={`rename-error-${meter.id}`} className="form-error" role="alert">{error}</p>}
          <div className="form-actions setup-actions"><Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Abbrechen</Button><Button type="submit">{pending ? 'Wird gespeichert …' : 'Speichern'}</Button></div>
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>;
}
