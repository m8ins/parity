'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Contract, Meter } from '@/lib/types';
import { settlementPayload } from '@/lib/billing-actions';
import { inclusiveEnd } from '@/lib/billing-period';
import { formatDate } from '@/lib/date-utils';
import { localToday, setupNumber } from '@/lib/meter-setup';
import { formatReading } from '@/lib/readings';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText } from './ui/input-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

type Draft = { period: Contract; args: ReturnType<typeof settlementPayload>; kind: string; amount: string; date: string };
const dateLabel = (value: string) => formatDate(value, 'de-DE');

export function BillingSettlement({ meter, period, onSaved, onEnd }: {
  meter: Meter; period: Contract; onSaved: (period: Contract) => void; onEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [snapshot, setSnapshot] = useState(period);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [success, setSuccess] = useState(false);
  const [readable, setReadable] = useState(true);
  const baseline = useRef('');
  const request = useRef<Draft | null>(null);
  const inFlight = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const prefix = useId();
  const key = `parity:settlement:${meter.user_id}:${period.id}`;
  const dirty = JSON.stringify([kind, amount, date]) !== baseline.current;
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, discard, success]);
  useEffect(() => {
    if (!open || success || !(dirty || uncertain || busy)) return;
    const protect = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [open, success, dirty, uncertain, busy]);
  function begin() {
    const value = period.settlement_amount;
    const initialKind = value == null ? '' : value >= 0 ? 'refund' : 'due';
    const initialAmount = value == null ? '' : formatReading(Math.abs(value));
    setKind(initialKind); setAmount(initialAmount); setDate(period.settlement_date ?? ''); setSnapshot(period);
    baseline.current = JSON.stringify([initialKind, initialAmount, period.settlement_date ?? '']);
    setError(''); setUncertain(false); setConflict(false); setSuccess(false); setDiscard(false); setReadable(true); request.current = null;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        if (draft.period.id !== period.id || !draft.args || !draft.kind || typeof draft.amount !== 'string' || !draft.date) throw new Error('Ungültiger Beleg');
        request.current = draft; setSnapshot(draft.period); setKind(draft.kind === 'balanced' ? 'refund' : draft.kind); setAmount(draft.kind === 'balanced' ? '0' : draft.amount); setDate(draft.date); setUncertain(true);
        setError('Eine Speicherung ist noch nicht bestätigt. Prüfe sie mit denselben Angaben.');
      }
    } catch { setReadable(false); setError('Der Wiederholschutz ist nicht lesbar. Erlaube Sitzungsspeicher und öffne die Abrechnung erneut. Es wird nichts gesendet.'); }
    setOpen(true);
  }
  function close() {
    if (inFlight.current) return;
    if (!success && (dirty || uncertain)) setDiscard(true); else setOpen(false);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || conflict || !readable) return;
    const number = setupNumber(amount);
    if (!kind || !Number.isFinite(number)) { setError('Wähle das Ergebnis und gib einen Betrag ab 0 ein. Eine ausdrücklich eingegebene 0 bedeutet ausgeglichen.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date < snapshot.period_start || date > localToday()) { setError('Gib ein gültiges Abrechnungsdatum zwischen Zeitraumstart und heute ein.'); return; }
    const draft = request.current ?? { period: snapshot, args: settlementPayload(snapshot, kind === 'due' ? -number : number, date), kind, amount, date };
    try { sessionStorage.setItem(key, JSON.stringify(draft)); }
    catch { setError('Der Wiederholschutz konnte nicht gespeichert werden. Erlaube Sitzungsspeicher. Es wurde nichts gesendet.'); return; }
    request.current = draft; inFlight.current = true; setBusy(true); setUncertain(true); setError('');
    try {
      const result = await createClient().rpc('save_billing_settlement', draft.args);
      if (result.error) {
        if (['40001', '22023', '42501', '28000', '22008', '22P02'].includes(result.error.code)) {
          setUncertain(false); setConflict(true); request.current = null;
          try { sessionStorage.removeItem(key); } catch { /* absolute target remains safe */ }
          setError('Die Abrechnung wurde nicht gespeichert. Lade den aktuellen Stand und prüfe deine erhaltenen Eingaben.'); return;
        }
        throw result.error;
      }
      if (!result.data?.id) throw new Error('Keine Speicherbestätigung');
      onSaved(result.data as Contract); setSuccess(true); setUncertain(false);
      try { sessionStorage.removeItem(key); } catch { /* exact retry remains safe */ }
    } catch { setError('Die Speicherung ist noch nicht bestätigt. Deine Eingaben bleiben erhalten. „Speicherung prüfen“ sendet dieselben Zielwerte erneut.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function reload() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      const result = await createClient().from('contracts').select('*').eq('id', period.id).single();
      if (result.error || !result.data) throw result.error;
      setSnapshot(result.data); onSaved(result.data); setConflict(false); setError('Aktueller Stand geladen. Prüfe deine erhaltenen Eingaben vor dem Speichern.');
    } catch { setError('Der aktuelle Stand konnte nicht geladen werden. Deine Eingaben bleiben erhalten.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <>
    <Button ref={opener} variant="outline" size="sm" onClick={begin}>{period.settlement_amount == null ? 'Abrechnung erfassen' : 'Abrechnung korrigieren'}</Button>
    <Dialog open={open} onOpenChange={next => { if (!next) close(); }}>
      <DialogContent className="condition-dialog billing-dialog" aria-busy={busy} showCloseButton={!busy} onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { event.preventDefault(); close(); }} onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
        <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>{discard ? uncertain ? 'Später prüfen?' : 'Eingaben verwerfen?' : success ? 'Abrechnung gespeichert' : `Abrechnung für ${meter.name}`}</DialogTitle><DialogDescription>{discard ? uncertain ? 'Die Angaben bleiben in dieser Browsersitzung zur Prüfung erhalten.' : 'Deine Änderungen wurden noch nicht gespeichert.' : `${dateLabel(snapshot.period_start)}${snapshot.period_end ? ` – ${dateLabel(inclusiveEnd(snapshot))}` : ' · Ende offen'}`}</DialogDescription></DialogHeader>
        {discard ? <div className="form-actions setup-actions"><Button variant="ghost" onClick={() => setDiscard(false)}>Weiter bearbeiten</Button><Button onClick={() => setOpen(false)}>{uncertain ? 'Später prüfen' : 'Verwerfen'}</Button></div> : success ? <><p role="status">Das tatsächliche Ergebnis ist erfasst.</p><Button onClick={() => setOpen(false)}>Fertig</Button></> : !snapshot.period_end && !uncertain ? <><p>Lege zuerst den tatsächlichen letzten Abrechnungstag fest.</p><Button onClick={() => { setOpen(false); onEnd(); }}>Ende festlegen</Button></> : <form className="parity-form" onSubmit={save} noValidate>
          <fieldset disabled={busy || uncertain || conflict}>
            <fieldset className="settlement-result"><legend>Ergebnis</legend><div className="settlement-segments">
              {[{ value: 'refund', label: 'Erstattung', Icon: ArrowDownLeft }, { value: 'due', label: 'Nachzahlung', Icon: ArrowUpRight }].map(({ value, label, Icon }) => <label key={value} className={`settlement-segment settlement-segment-${value}`}><input type="radio" name={`${prefix}-kind`} value={value} checked={kind === value} onChange={() => setKind(value)} /><span><Icon aria-hidden="true" /><span>{label}</span></span></label>)}
            </div></fieldset>
            <div className="setup-field"><label htmlFor={`${prefix}-amount`}>Betrag</label><InputGroup className="settlement-amount"><InputGroupInput id={`${prefix}-amount`} inputMode="decimal" value={amount} placeholder="15,37" aria-describedby={`${prefix}-currency`} onChange={event => setAmount(event.target.value)} /><InputGroupAddon align="inline-end"><InputGroupText id={`${prefix}-currency`}>€</InputGroupText></InputGroupAddon></InputGroup>
              {amount.trim() !== '' && setupNumber(amount) === 0 && <p className="text-sm numeric" role="status">Abrechnung ausgeglichen · 0,00 €</p>}
            </div>
            <div className="setup-field"><label htmlFor={`${prefix}-date`}>Abrechnungsdatum</label><Input id={`${prefix}-date`} type="date" value={date} max={localToday()} onChange={event => setDate(event.target.value)} /></div>
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions setup-actions"><Button type="button" variant="ghost" disabled={busy} onClick={close}>Abbrechen</Button>{conflict ? <Button type="button" disabled={busy} onClick={reload}>Aktuellen Stand laden</Button> : <Button type="submit" disabled={busy || !readable}>{busy ? 'Wird gespeichert …' : uncertain ? 'Speicherung prüfen' : 'Abrechnung speichern'}</Button>}</div>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}
