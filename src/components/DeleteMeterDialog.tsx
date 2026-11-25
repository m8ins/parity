'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { removeMeter, MeterManagementError } from '@/lib/meter-management';
import type { Meter } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

export function DeleteMeterDialog({ meter, open, onOpenChange, onDeleted, returnFocus }: { meter: Meter; open: boolean; onOpenChange: (open: boolean) => void; onDeleted: () => void; returnFocus?: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const confirm = async () => {
    if (busy.current) return;
    busy.current = true; setPending(true); setError('');
    try { await removeMeter(createClient(), meter); onOpenChange(false); onDeleted(); }
    catch (cause) { setError(cause instanceof MeterManagementError ? cause.message : 'Die Löschung konnte nicht bestätigt werden. Bitte prüfe die Löschung erneut.'); }
    finally { busy.current = false; setPending(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy.current) onOpenChange(value); }}>
    <DialogContent ref={content} showCloseButton={!pending} onOpenAutoFocus={event => { event.preventDefault();
      if (content.current && content.current.scrollHeight > content.current.clientHeight + 1) title.current?.focus();
      else cancel.current?.focus(); }} onCloseAutoFocus={event => { if (returnFocus) { event.preventDefault();
        // A rapid next action may already have moved focus into another menu.
        if (document.activeElement === document.body || document.activeElement?.closest('[role="dialog"]')) returnFocus(); } }}>
      <DialogHeader><DialogTitle ref={title} tabIndex={-1} className="meter-delete-title">Zähler entfernen</DialogTitle><DialogDescription><span className="meter-delete-context">{meter.name}</span>Der Zähler und alle zugehörigen Ablesungen, Zeiträume, Konditionen, früheren Konditionsfassungen und Abrechnungsergebnisse werden dauerhaft gelöscht. Das lässt sich nicht rückgängig machen. Andere Zähler bleiben erhalten.</DialogDescription></DialogHeader>
      <p className="text-sm text-muted-foreground">Geschützte interne Nachweise können erhalten bleiben. Eine Wiederherstellung in Parity ist nicht möglich.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions setup-actions" aria-busy={pending}>
        <Button ref={cancel} variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Abbrechen</Button>
        <Button variant="destructive" disabled={pending} onClick={confirm}>{pending ? 'Wird geprüft …' : error ? 'Löschung erneut prüfen' : 'Zähler endgültig entfernen'}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
