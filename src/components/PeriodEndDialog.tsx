'use client';

import { useEffect, useRef, useState } from 'react';
import type { Contract } from '@/lib/types';
import { exclusiveEnd, inclusiveEnd, validPeriodEnd } from '@/lib/billing-period';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

export function PeriodEndDialog({ period, open, onClose, onSaved, returnFocus }: {
  period: Contract; open: boolean; onClose: () => void; onSaved: (period: Contract) => void;
  returnFocus?: () => void;
}) {
  const [value, setValue] = useState(inclusiveEnd(period));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const inFlight = useRef(false);
  const dirty = value !== inclusiveEnd(period);
  useEffect(() => {
    if (open) { setValue(inclusiveEnd(period)); setError(''); setDiscard(false); }
  }, [open, period]);
  useEffect(() => {
    if (!open || !dirty) return;
    const protect = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [open, dirty]);
  function close() {
    if (inFlight.current) return;
    if (dirty) setDiscard(true); else onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!validPeriodEnd(value, period.period_start)) { setError('Das Ende muss ein gültiger Tag ab dem Beginn des Zeitraums sein.'); return; }
    inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await createClient().rpc('set_billing_period_end', {
        p_period_id: period.id, p_expected_start: period.period_start, p_expected_end: period.period_end ?? null, p_end: exclusiveEnd(value),
      });
      if (result.error?.code === '22023') { setError(result.error.message); return; }
      if (result.error || !result.data?.id) throw result.error ?? new Error('Keine Speicherbestätigung');
      onSaved(result.data as Contract); onClose();
    } catch {
      setError('Das Zeitraumende ist noch nicht bestätigt. Deine Eingabe bleibt erhalten. Du kannst denselben Wert erneut speichern. Wurde der Zeitraum inzwischen geändert, öffne die Seite zusätzlich neu und prüfe den aktuellen Stand.');
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={next => { if (!next) close(); }}><DialogContent className="period-end-dialog" aria-busy={busy} showCloseButton={!busy} onCloseAutoFocus={event => { if (returnFocus) { event.preventDefault(); returnFocus(); } }} onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { event.preventDefault(); close(); }}>
    <DialogHeader><DialogTitle>{discard ? 'Eingabe verwerfen?' : 'Zeitraumende'}</DialogTitle><DialogDescription>{discard ? 'Deine Änderung wurde noch nicht bestätigt. Falls du bereits gespeichert hast, prüfe den Stand nach erneutem Öffnen.' : 'Bis zu welchem Tag rechnet dein Anbieter ab?'}</DialogDescription></DialogHeader>
    {discard ? <div className="form-actions setup-actions"><Button variant="ghost" onClick={() => setDiscard(false)}>Weiter bearbeiten</Button><Button onClick={onClose}>Verwerfen</Button></div> : <form className="parity-form" onSubmit={save} noValidate>
      <div className="setup-field"><label htmlFor="billing-period-end">Bis einschließlich (optional)</label><Input id="billing-period-end" type="date" min={period.period_start} value={value} disabled={busy} onChange={event => { setValue(event.target.value); setError(''); }} aria-describedby="billing-period-end-hint" aria-invalid={Boolean(error)} /><p id="billing-period-end-hint" className="text-sm text-muted-foreground">Noch unbekannt? Lass das Feld leer. Der Abrechnungszeitraum bleibt offen.</p></div>
      {dirty && <p className="text-sm">Das Ende begrenzt die Einschätzung. Vorhandene Ablesungen und Konditionen bleiben erhalten.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions setup-actions"><Button type="button" variant="ghost" disabled={busy} onClick={close}>Abbrechen</Button><Button type="submit" disabled={busy || !dirty}>{busy ? 'Wird gespeichert …' : 'Zeitraumende speichern'}</Button></div>
    </form>}
  </DialogContent></Dialog>;
}
