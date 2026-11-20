'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Contract, Meter, MeterData, Rate } from '@/lib/types';
import { continuationErrors, continuationInitialRate, continuationPayload } from '@/lib/billing-actions';
import { conditionFields, conditionValues, type ConditionValues } from '@/lib/conditions';
import { inclusiveEnd, shiftDate } from '@/lib/billing-period';
import { formatDate } from '@/lib/date-utils';
import { createClient } from '@/lib/supabase/client';
import { loadMeterData } from '@/lib/contracts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

type InputValues = { start: string; end: string; provider: string; values: ConditionValues; confirmBoundary: boolean };
type Draft = { requestId: string; payload: ReturnType<typeof continuationPayload>; period: Contract; contracts: Contract[]; rates: Rate[]; input: InputValues };
const dateLabel = (date: string) => formatDate(date, 'de-DE');
export function BillingContinuation({ meter, period, contracts, rates, onSaved, onSelect, onReload }: {
  meter: Meter; period: Contract; contracts: Contract[]; rates: Rate[];
  onSaved: (result: { previous: Contract; contract: Contract; rates: Rate[] }) => void;
  onSelect: (id: string) => void; onReload: (data: MeterData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'dates' | 'values' | 'review' | 'success'>('dates');
  const [input, setInput] = useState<InputValues>({ start: '', end: '', provider: '', values: conditionValues(), confirmBoundary: false });
  const [snapshot, setSnapshot] = useState({ period, contracts, rates });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [readable, setReadable] = useState(true);
  const [nextId, setNextId] = useState('');
  const request = useRef<Draft | null>(null);
  const inFlight = useRef(false);
  const baseline = useRef('');
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const prefix = useId();
  const key = `parity:continuation:${meter.user_id}:${meter.id}`;
  const dirty = JSON.stringify(input) !== baseline.current;
  const fields = conditionFields.filter(field => meter.type === 'gas' || field.key !== 'umrechnungsfaktor');
  const future = snapshot.rates.filter(rate => rate.effective_from > input.start).sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  const newest = [...snapshot.contracts].sort((a, b) => b.period_start.localeCompare(a.period_start))[0];
  const following = newest?.id !== snapshot.period.id ? newest : undefined;
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, step, discard, pendingStart]);
  useEffect(() => {
    if (!open || step === 'success' || !(dirty || uncertain || busy)) return;
    const protect = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [open, step, dirty, uncertain, busy]);
  function begin() {
    const start = period.period_end ?? '';
    const initial = { start, end: '', provider: period.provider ?? '', values: conditionValues(continuationInitialRate(period, rates, start)), confirmBoundary: false };
    setInput(initial); baseline.current = JSON.stringify(initial); setSnapshot({ period, contracts, rates });
    setStep('dates'); setError(''); setUncertain(false); setConflict(false); setDiscard(false); setPendingStart(null); setReadable(true); request.current = null;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        if (!draft.requestId || draft.period.meter_id !== meter.id || !draft.input || !draft.payload || !Array.isArray(draft.contracts) || !Array.isArray(draft.rates)) throw new Error('Ungültiger Beleg');
        request.current = draft; setSnapshot({ period: draft.period, contracts: draft.contracts, rates: draft.rates }); setInput(draft.input); setStep('review'); setUncertain(true);
        setError('Eine frühere Speicherung ist noch nicht bestätigt. Prüfe denselben Auftrag.');
      }
    } catch { setReadable(false); setError('Der Wiederholschutz ist nicht lesbar. Erlaube Sitzungsspeicher und öffne den Ablauf erneut. Es wird nichts gesendet.'); }
    setOpen(true);
  }
  function close() {
    if (inFlight.current) return;
    if (step !== 'success' && (dirty || uncertain)) setDiscard(true); else setOpen(false);
  }
  function next(event: React.FormEvent) {
    event.preventDefault();
    if (step === 'dates') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.start) || Number.isNaN(Date.parse(input.start)) || new Date(input.start).toISOString().slice(0, 10) !== input.start || input.start <= snapshot.period.period_start) { setError('Der Beginn muss ein gültiger Tag nach dem bisherigen Zeitraumstart sein.'); return; }
      if (input.end && (!/^\d{4}-\d{2}-\d{2}$/.test(input.end) || Number.isNaN(Date.parse(input.end)) || new Date(input.end).toISOString().slice(0, 10) !== input.end || input.end < input.start)) { setError('Das Ende muss ein gültiger Tag ab dem neuen Beginn sein.'); return; }
      // Each entry is a real dated snapshot; nothing outside the new boundary is silently dropped.
      if (input.end && future.some(rate => rate.effective_from > input.end)) { setError('Spätere Konditionen liegen nach diesem Ende. Passe das Ende an oder kläre diese Einträge zuerst in der Konditionspflege.'); return; }
      const source = continuationInitialRate(snapshot.period, snapshot.rates, input.start);
      // Values stay editable and survive going back. Changed date deliberately asks for a new review.
      if (!request.current && Object.values(input.values).every(value => !value)) setInput(previous => ({ ...previous, values: conditionValues(source) }));
      setError(''); setStep('values'); return;
    }
    const errors = continuationErrors(snapshot.period, snapshot.contracts, snapshot.rates, { ...input, confirmBoundary: true }, meter.type === 'gas');
    if (Object.keys(errors).length) { setError(Object.values(errors).join(' ')); return; }
    setError(''); setStep('review');
  }
  function changeStart(start: string) {
    const source = conditionValues(continuationInitialRate(snapshot.period, snapshot.rates, input.start));
    if (fields.some(({ key }) => input.values[key] !== source[key])) { setPendingStart(start); return; }
    applyStart(start);
  }
  function applyStart(start: string) {
    setInput(previous => ({ ...previous, start, values: conditionValues(continuationInitialRate(snapshot.period, snapshot.rates, start)), confirmBoundary: false }));
    setPendingStart(null);
  }
  async function save() {
    if (inFlight.current || conflict || !readable) return;
    const errors = continuationErrors(snapshot.period, snapshot.contracts, snapshot.rates, input, meter.type === 'gas');
    if (!uncertain && Object.keys(errors).length) { setError(Object.values(errors).join(' ')); return; }
    const draft = request.current ?? { requestId: crypto.randomUUID(), payload: continuationPayload(snapshot.period, snapshot.contracts, snapshot.rates, input, meter.type === 'gas'), ...snapshot, input };
    try { sessionStorage.setItem(key, JSON.stringify(draft)); }
    catch { setError('Der Wiederholschutz konnte nicht gespeichert werden. Erlaube Sitzungsspeicher. Es wurde nichts gesendet.'); return; }
    request.current = draft; inFlight.current = true; setBusy(true); setUncertain(true); setError('');
    try {
      const result = await createClient().rpc('continue_billing_period', { p_request_id: draft.requestId, p_payload: draft.payload });
      if (result.error) {
        if (['40001', '22023', '23505', '42501', '28000', '22P02', '22008'].includes(result.error.code)) {
          setUncertain(false); setConflict(true); request.current = null;
          try { sessionStorage.removeItem(key); } catch { /* failed transaction creates no period */ }
          setError('Der Zeitraum wurde nicht angelegt. Lade den aktuellen Stand und prüfe deine erhaltenen Eingaben.'); return;
        }
        throw result.error;
      }
      if (!result.data?.confirmed || !result.data.contract?.id || !result.data.previous?.id || !Array.isArray(result.data.rates)) throw new Error('Keine Speicherbestätigung');
      onSaved(result.data); setNextId(result.data.contract.id); setUncertain(false); setStep('success');
      try { sessionStorage.removeItem(key); } catch { /* server receipt makes replay safe */ }
    } catch { setError('Die Speicherung ist noch nicht bestätigt. Deine Eingaben bleiben erhalten. „Speicherung prüfen“ wiederholt denselben Auftrag.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function reload() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      const data = await loadMeterData(createClient(), meter.id);
      const fresh = data.contracts.find(item => item.id === snapshot.period.id);
      if (!fresh) throw new Error('Zeitraum nicht verfügbar');
      setSnapshot({ period: fresh, contracts: data.contracts, rates: data.ratesByContract[fresh.id] ?? [] }); onReload(data);
      setConflict(false); setStep('dates'); setInput(previous => ({ ...previous, confirmBoundary: false })); setError('Aktueller Stand geladen. Deine Eingaben sind erhalten. Prüfe Beginn und Konditionen erneut.');
    } catch { setError('Der aktuelle Stand konnte nicht geladen werden. Deine Eingaben bleiben erhalten.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const boundaryChanged = !snapshot.period.period_end || input.start < snapshot.period.period_end;
  const gap = snapshot.period.period_end && input.start > snapshot.period.period_end;
  function numbers(values: ConditionValues) {
    return <dl className="condition-values numeric">{fields.map(({ key, label, unit }) => <div key={key}><dt>{label}</dt><dd>{values[key]} {unit}</dd></div>)}</dl>;
  }
  return <>
    <Button ref={opener} variant="outline" size="sm" onClick={begin}>Neuen Zeitraum anlegen</Button>
    <Dialog open={open} onOpenChange={value => { if (!value) close(); }}><DialogContent className="condition-dialog billing-dialog" aria-busy={busy} showCloseButton={!busy} onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { event.preventDefault(); close(); }} onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
      <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>{discard ? uncertain ? 'Später prüfen?' : 'Eingaben verwerfen?' : pendingStart !== null ? 'Beginn ändern?' : step === 'success' ? 'Zeitraum angelegt' : step === 'review' ? 'Neuen Zeitraum prüfen' : step === 'values' ? 'Konditionen zum Beginn' : `Neuer Zeitraum für ${meter.name}`}</DialogTitle><DialogDescription>{discard ? uncertain ? 'Öffne den Ablauf später erneut, um die Speicherung zu prüfen.' : 'Deine Änderungen wurden noch nicht gespeichert.' : pendingStart !== null ? 'Deine bearbeiteten Anfangswerte werden durch die am neuen Beginn gültigen Konditionen ersetzt.' : step === 'success' ? 'Der Zähler und seine Ablesungen werden weiterverwendet.' : `Bisher: ${dateLabel(snapshot.period.period_start)}${snapshot.period.period_end ? ` – ${dateLabel(inclusiveEnd(snapshot.period))}` : ' · offen'}`}</DialogDescription></DialogHeader>
      {discard ? <div className="form-actions setup-actions"><Button variant="ghost" onClick={() => setDiscard(false)}>Weiter bearbeiten</Button><Button onClick={() => setOpen(false)}>{uncertain ? 'Später prüfen' : 'Verwerfen'}</Button></div> : pendingStart !== null ? <div className="form-actions setup-actions"><Button variant="ghost" onClick={() => setPendingStart(null)}>Beginn beibehalten</Button><Button onClick={() => applyStart(pendingStart)}>Neue Werte übernehmen</Button></div> : step === 'success' ? <><p role="status">Der neue Zeitraum ist gespeichert.</p><Button onClick={() => { setOpen(false); onSelect(nextId); }}>Neuen Zeitraum ansehen</Button></> : following && !uncertain ? <><p>Es gibt bereits einen späteren Zeitraum. Setze dort fort.</p><Button onClick={() => { setOpen(false); onSelect(following.id); }}>Folgezeitraum ansehen</Button></> : <form className="parity-form" onSubmit={step === 'review' ? event => { event.preventDefault(); void save(); } : next} noValidate>
        {step === 'dates' ? <fieldset disabled={busy}>
          <div className="setup-field"><label htmlFor={`${prefix}-start`}>Beginn</label><Input id={`${prefix}-start`} type="date" value={input.start} onChange={event => changeStart(event.target.value)} /></div>
          <div className="setup-field"><label htmlFor={`${prefix}-end`}>Bis einschließlich (optional)</label><Input id={`${prefix}-end`} type="date" value={input.end} onChange={event => setInput(previous => ({ ...previous, end: event.target.value, confirmBoundary: false }))} /><p className="text-sm text-muted-foreground">Ohne Ende bleibt der neue Zeitraum offen.</p></div>
          <div className="setup-field"><label htmlFor={`${prefix}-provider`}>Anbieter (optional)</label><Input id={`${prefix}-provider`} value={input.provider} placeholder="z. B. Stadtwerke" onChange={event => setInput(previous => ({ ...previous, provider: event.target.value }))} /></div>
        </fieldset> : step === 'values' ? <fieldset disabled={busy}>
          {!continuationInitialRate(snapshot.period, snapshot.rates, input.start) && <p>Zum Beginn sind keine eindeutigen Konditionen vorhanden. Trage die gültigen Werte ein.</p>}
          {fields.map(({ key, label, unit }) => <div className="setup-field" key={key}><label htmlFor={`${prefix}-${key}`}>{label} ({unit})</label><Input id={`${prefix}-${key}`} inputMode="decimal" value={input.values[key]} placeholder="Bitte eintragen" onChange={event => setInput(previous => ({ ...previous, values: { ...previous.values, [key]: event.target.value }, confirmBoundary: false }))} /></div>)}
        </fieldset> : <>
          <dl className="condition-values"><div><dt>Neuer Zeitraum</dt><dd>{dateLabel(input.start)}{input.end ? ` – ${dateLabel(input.end)}` : ' · offen'}</dd></div><div><dt>Anbieter</dt><dd>{input.provider || 'Nicht eingetragen'}</dd></div></dl>
          <p>{boundaryChanged ? `Bisheriges Ende: ${snapshot.period.period_end ? dateLabel(inclusiveEnd(snapshot.period)) : 'offen'}. Neues Ende: bis einschließlich ${dateLabel(shiftDate(input.start, -1))}.` : `Das bisherige Ende bleibt bei ${dateLabel(inclusiveEnd(snapshot.period))}.`}</p>
          {gap && <p>Es bleibt eine Lücke vom {dateLabel(snapshot.period.period_end!)} bis einschließlich {dateLabel(shiftDate(input.start, -1))}.</p>}
          <details className="condition-entry"><summary>Anfangskonditionen ab {dateLabel(input.start)}</summary>{numbers(input.values)}</details>
          {future.length > 0 && <div className="billing-future"><p>{future.length} spätere Konditionsänderung{future.length === 1 ? '' : 'en'} wird übernommen. Die Originale bleiben im bisherigen Zeitraum.</p>{future.map(rate => <details className="condition-entry" key={rate.id}><summary>Ab {dateLabel(rate.effective_from)}</summary>{numbers(conditionValues(rate))}</details>)}</div>}
          <label className="billing-confirm"><input type="checkbox" checked={input.confirmBoundary} disabled={busy || uncertain || conflict} onChange={event => setInput(previous => ({ ...previous, confirmBoundary: event.target.checked }))} /><span>Zeitraumgrenze{gap ? ', Lücke' : ''}{future.length ? ' und spätere Konditionen' : ''} geprüft</span></label>
        </>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions setup-actions"><Button type="button" variant="ghost" disabled={busy} onClick={close}>Abbrechen</Button>{step !== 'dates' && !uncertain && !conflict && <Button type="button" variant="outline" disabled={busy} onClick={() => { setStep(step === 'review' ? 'values' : 'dates'); setInput(previous => ({ ...previous, confirmBoundary: false })); setError(''); }}>Zurück</Button>}{conflict ? <Button type="button" disabled={busy} onClick={reload}>Aktuellen Stand laden</Button> : <Button type="submit" disabled={busy || !readable || (step === 'review' && !input.confirmBoundary)}>{busy ? 'Wird gespeichert …' : uncertain ? 'Speicherung prüfen' : step === 'review' ? 'Zeitraum beginnen' : step === 'dates' ? 'Konditionen prüfen' : 'Weiter zur Prüfung'}</Button>}</div>
      </form>}
    </DialogContent></Dialog>
  </>;
}
