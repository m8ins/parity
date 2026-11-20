'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { activeRate, periodEnd } from '@/lib/calculations';
import { conditionErrors, conditionFields, conditionPayload, conditionRange, conditionValues, deletionEffect, nextCondition, type ConditionOperation, type ConditionPayload, type ConditionRevision, type ConditionValues } from '@/lib/conditions';
import { periodIsFinished } from '@/lib/billing-period';
import { localToday, setupNumber } from '@/lib/meter-setup';
import { formatDate } from '@/lib/date-utils';
import { formatReading } from '@/lib/readings';
import { createClient } from '@/lib/supabase/client';
import type { Contract, Rate } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from './ui/input-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

type Draft = { requestId: string; payload: ConditionPayload; values: ConditionValues };
const conditionNumber = (value: number, unit: string) => unit.startsWith('€') ? value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : formatReading(value);
const dateLabel = (date: string) => formatDate(date, 'de-DE');
const dayBefore = (date: string) => new Date(Date.parse(date) - 86400000).toISOString().slice(0, 10);

export function RateHistory({ contract, initialData: rates, isGas, userId, onChange, onUnderstand, asOf }: {
  contract: Contract; initialData: Rate[]; isGas: boolean; userId: string;
  onChange: (rates: Rate[]) => void; onUnderstand: () => void; asOf?: string;
}) {
  const today = asOf ?? localToday();
  const defaultDate = today < contract.period_start ? contract.period_start : contract.period_end && today >= contract.period_end ? dayBefore(contract.period_end!) : today;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'edit' | 'review' | 'success'>('edit');
  const [operation, setOperation] = useState<ConditionOperation>('create');
  const [target, setTarget] = useState<Rate>();
  const [date, setDate] = useState(defaultDate);
  const [sourceDate, setSourceDate] = useState(defaultDate);
  const [values, setValues] = useState<ConditionValues>(() => conditionValues());
  const [baseline, setBaseline] = useState<ConditionValues>(() => conditionValues());
  const [snapshot, setSnapshot] = useState(rates);
  const [errors, setErrors] = useState<ReturnType<typeof conditionErrors>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingDate, setPendingDate] = useState('');
  const [revisions, setRevisions] = useState<ConditionRevision[]>([]);
  const [revisionError, setRevisionError] = useState('');
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [storageReadable, setStorageReadable] = useState(true);
  const request = useRef<Draft | null>(null);
  const inFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const prefix = useId();
  const storageKey = `parity:conditions:${userId}:${contract.id}`;
  const fields = conditionFields.filter(field => isGas || field.key !== 'umrechnungsfaktor');
  const dirty = fields.some(({ key }) => values[key] !== baseline[key]) || date !== (target?.effective_from ?? defaultDate);
  const current = activeRate(rates, periodIsFinished(contract, today) ? dayBefore(contract.period_end!) : today);
  const following = nextCondition(snapshot, date);
  const historical = periodIsFinished(contract, today) || contract.settlement_amount != null;
  const duplicateDates = [...new Set(rates.filter((rate, index) => rates.some((other, otherIndex) => index !== otherIndex && other.effective_from === rate.effective_from)).map(rate => rate.effective_from))];

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, step, confirmClose, pendingDate]);
  useEffect(() => {
    if (!open || step === 'success' || !(dirty || uncertain || busy)) return;
    const protect = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [open, step, dirty, uncertain, busy]);

  function begin(event: React.MouseEvent<HTMLButtonElement>, op: ConditionOperation = 'create', rate?: Rate) {
    opener.current = event.currentTarget;
    setOperation(op); setTarget(rate); setSnapshot(rates);
    const selectedDate = rate?.effective_from ?? defaultDate;
    const initial = conditionValues(rate ?? activeRate(rates, selectedDate));
    setDate(selectedDate); setSourceDate(selectedDate); setValues(initial); setBaseline(initial); setErrors({}); setError('');
    setStep(op === 'delete' ? 'review' : 'edit'); setUncertain(false); setConflict(false); setConfirmClose(false); setPendingDate(''); setStorageReadable(true); request.current = null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        if (!draft.requestId || draft.payload.contract_id !== contract.id || !draft.values) throw new Error('Ungültiger Entwurf');
        const original = draft.payload.expected_rates.map(rate => ({ ...rate, contract_id: contract.id, created_at: '' }));
        request.current = draft; setOperation(draft.payload.operation); setDate(draft.payload.effective_from); setSnapshot(original);
        setTarget(original.find(item => item.id === draft.payload.rate_id)); setValues(draft.values); setBaseline(draft.values);
        setStep('review'); setUncertain(true);
        setError('Eine frühere Speicherung ist noch nicht bestätigt. Prüfe sie mit demselben Auftrag.');
      }
    } catch { setStorageReadable(false); setError('Der Wiederholschutz konnte nicht gelesen werden. Es wird nichts gesendet. Erlaube Sitzungsspeicher und öffne die Bearbeitung erneut. Ein beschädigter Speicherbeleg muss zuerst geprüft werden.'); }
    setOpen(true);
  }
  function close() {
    if (inFlight.current) return;
    if (step !== 'success' && (dirty || uncertain)) setConfirmClose(true);
    else setOpen(false);
  }
  function applyDate(next: string) {
    setDate(next); setSourceDate(next); const initial = conditionValues(activeRate(snapshot, next));
    setValues(initial); setBaseline(initial); setErrors({}); setPendingDate('');
  }
  function changeDate(next: string) {
    if (!next) { setDate(''); return; }
    if (fields.some(({ key }) => values[key] !== baseline[key])) setPendingDate(next);
    else applyDate(next);
  }
  function review(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = conditionErrors(contract, snapshot, date, values, isGas, operation);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      requestAnimationFrame(() => document.getElementById(`${prefix}-${Object.keys(nextErrors)[0]}`)?.focus());
      return;
    }
    if (operation !== 'delete' && fields.every(({ key }) => setupNumber(values[key]) === setupNumber(baseline[key]))) {
      setError('Ändere mindestens einen Wert.'); return;
    }
    setError(''); setStep('review');
  }
  async function save() {
    if (inFlight.current) return;
    if (!storageReadable) { setError('Der Wiederholschutz konnte nicht gelesen werden. Es wurde nichts gesendet. Prüfe den Sitzungsspeicher und öffne die Bearbeitung erneut.'); return; }
    const draft = request.current ?? { requestId: crypto.randomUUID(), payload: conditionPayload(contract, snapshot, operation, date, values, isGas, target?.id), values };
    try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); }
    catch { setError('Der Wiederholschutz konnte nicht gespeichert werden. Erlaube Sitzungsspeicher und versuche es erneut. Es wurde nichts gesendet.'); return; }
    request.current = draft; inFlight.current = true; setBusy(true); setUncertain(true); setError('');
    try {
      const result = await createClient().rpc('change_conditions', { p_request_id: draft.requestId, p_payload: draft.payload });
      if (result.error) {
        // A structured transaction rejection is known to have rolled back.
        if (['22023', '23505', '42501', '40001', '28000', '22P02', '22008'].includes(result.error.code)) {
          request.current = null; setUncertain(false); setConflict(true);
          try { sessionStorage.removeItem(storageKey); } catch { /* retrying rejected request is safe */ }
          setError(result.error.code === '40001' ? 'Die Konditionen oder der Zeitraum wurden inzwischen geändert. Lade den aktuellen Stand und prüfe deine erhaltenen Eingaben.' : 'Die Änderung wurde abgewiesen. Lade den aktuellen Stand und prüfe Datum, Berechtigung und Werte.');
          return;
        }
        throw result.error;
      }
      if (!result.data?.confirmed || !Array.isArray(result.data.rates)) throw new Error('Keine Speicherbestätigung');
      onChange(result.data.rates as Rate[]); setUncertain(false); setStep('success'); setRevisions([]);
      try { sessionStorage.removeItem(storageKey); } catch { /* receipt allows safe recovery */ }
    } catch {
      setError('Die Speicherung ist noch nicht bestätigt. Deine Eingaben bleiben erhalten. „Speicherung prüfen“ wiederholt denselben Auftrag sicher.');
    } finally { inFlight.current = false; setBusy(false); }
  }
  async function reload() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      const result = await createClient().from('contracts').select('*, rates(*)').eq('id', contract.id).single();
      if (result.error || !result.data) throw result.error;
      // A period edit needs the full server view; retain the draft until then.
      if (result.data.period_start !== contract.period_start || (result.data.period_end ?? null) !== (contract.period_end ?? null)) {
        setError('Der Zeitraum wurde verändert. Deine Eingaben bleiben hier erhalten. Öffne die Seite zusätzlich neu und prüfe die neue Zeitraumgrenze.'); return;
      }
      const fresh = result.data.rates as Rate[];
      if (operation !== 'create' && !fresh.some(rate => rate.id === target?.id)) {
        onChange(fresh); setError('Dieser Eintrag wurde inzwischen entfernt. Schließe die Bearbeitung und prüfe die aktuelle Historie. Deine bisherigen Eingaben bleiben bis zum Schließen erhalten.'); return;
      }
      setSnapshot(fresh); onChange(fresh); setConflict(false); setBaseline(conditionValues(operation === 'correct' ? fresh.find(rate => rate.id === target?.id) : activeRate(fresh, date)));
      setTarget(fresh.find(rate => rate.id === target?.id));
      setError('Aktueller Stand geladen. Deine Eingaben sind erhalten. Prüfe auch die übernommenen Werte.'); setStep(operation === 'delete' ? 'review' : 'edit');
    } catch { setError('Der aktuelle Stand konnte nicht geladen werden. Deine Eingaben bleiben erhalten. Versuche es erneut.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function loadRevisions() {
    setRevisionBusy(true); setRevisionError('');
    try {
      const result = await createClient().from('condition_revisions').select('*').eq('contract_id', contract.id).order('created_at', { ascending: false });
      if (result.error) throw result.error;
      setRevisions(result.data as ConditionRevision[]);
    } catch { setRevisionError('Frühere Fassungen konnten nicht geladen werden. Bitte erneut laden.'); }
    finally { setRevisionBusy(false); }
  }
  function numbers(rate?: Rate) {
    return <dl className="condition-values numeric">{fields.map(({ key, label, unit }) => <div key={key}><dt>{label}</dt><dd>{rate ? conditionNumber(rate[key], unit) : 'Nicht hinterlegt'}{rate ? ` ${unit}` : ''}</dd></div>)}</dl>;
  }
  const before = operation === 'correct' ? target : activeRate(snapshot, date);
  const changed = fields.filter(({ key }) => !before || setupNumber(values[key]) !== before[key]);
  const unchanged = fields.filter(({ key }) => before && setupNumber(values[key]) === before[key]);
  const deletion = target ? deletionEffect(snapshot, target) : null;
  const range = conditionRange(contract, snapshot, date);
  const beyondEstimate = !contract.period_end && date >= periodEnd(contract);
  function rangeLabel(rate: Rate) {
    const interval = conditionRange(contract, rates, rate.effective_from);
    return !interval ? 'Wirkt sich nicht auf den gewählten Zeitraum aus.' : interval.end ? `Bis einschließlich ${dateLabel(dayBefore(interval.end))}` : 'Gilt bis zur nächsten Änderung.';
  }
  const title = confirmClose ? uncertain ? 'Später weiterprüfen?' : 'Eingaben verwerfen?' : pendingDate ? 'Gültigkeitsdatum ändern?' : step === 'success' ? operation === 'delete' ? 'Konditionen gelöscht' : 'Konditionen gespeichert' : step === 'review' ? operation === 'delete' ? 'Konditionen löschen?' : operation === 'correct' ? 'Korrektur prüfen' : `Neue Konditionen ab ${dateLabel(date)}` : operation === 'correct' ? 'Konditionen korrigieren' : 'Konditionen ändern';
  return <div className="conditions">
    <div className="condition-intro"><h2>{today < contract.period_start ? 'Noch nicht begonnen' : periodIsFinished(contract, today) ? 'Zum Zeitraumende' : 'Aktuell gültig'}</h2>
      {numbers(current)}
      <Button onClick={event => begin(event)}>Konditionen ändern</Button>
    </div>
    {duplicateDates.length > 0 && <p className="form-error" role="alert">Mehrdeutige Konditionen am {duplicateDates.map(dateLabel).join(', ')}. Die betroffenen Abschnitte werden nicht geschätzt. Prüfe die Historie und entferne den falschen Eintrag ausdrücklich.</p>}
    <details className="understand-section"><summary>Konditionshistorie ({rates.length})</summary>
      {!rates.length && <p>Noch keine Konditionen hinterlegt.</p>}
      {[...rates].sort((a, b) => a.effective_from.localeCompare(b.effective_from) || a.id.localeCompare(b.id)).map(rate => <details className="condition-entry" key={rate.id}>
        <summary>Ab {dateLabel(rate.effective_from)}{rate.effective_from > today ? ' · geplant' : ''}</summary>
        <p className="text-sm text-muted-foreground">{rangeLabel(rate)}</p>
        {numbers(rate)}<div className="form-actions"><Button variant="outline" onClick={event => begin(event, 'correct', rate)}>Korrigieren</Button><Button variant="ghost" onClick={event => begin(event, 'delete', rate)}>Löschen</Button></div>
      </details>)}
      <details className="condition-entry" onToggle={event => { if (event.currentTarget.open) void loadRevisions(); }}><summary>Frühere Fassungen und Löschungen</summary>
        {revisionBusy ? <p role="status">Wird geladen …</p> : revisionError ? <><p role="alert" className="form-error">{revisionError}</p><Button variant="outline" onClick={loadRevisions}>Erneut laden</Button></> : revisions.length ? revisions.map(revision => <details key={revision.id}><summary>{revision.operation === 'delete' ? 'Gelöscht' : 'Korrigiert'} · gültig ab {dateLabel(revision.previous.effective_from)} · {dateLabel(revision.created_at.slice(0, 10))}</summary>{numbers(revision.previous)}</details>) : <p>Noch keine früheren Fassungen.</p>}
      </details>
    </details>
    <Dialog open={open} onOpenChange={value => { if (!value) close(); }}>
      <DialogContent className="condition-dialog" showCloseButton={!busy} aria-busy={busy}
        onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { event.preventDefault(); close(); }}
        onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
        <DialogHeader><DialogTitle ref={heading} tabIndex={-1}>{title}</DialogTitle><DialogDescription>{confirmClose ? uncertain ? 'Die Speicherung bleibt zur Prüfung erhalten. Öffne dafür erneut „Konditionen ändern“ in diesem Zeitraum.' : 'Die Änderungen wurden noch nicht gespeichert.' : pendingDate ? 'Die eingegebenen Werte werden durch die am neuen Datum gültigen Konditionen ersetzt.' : step === 'success' ? beyondEstimate ? 'Die Konditionen sind gespeichert. Für ihre Kostenauswirkung lege das Zeitraumende fest.' : 'Die Einschätzung verwendet jetzt die bestätigten Konditionen.' : `Für diesen Abrechnungszeitraum${operation === 'correct' ? ' · die bisherige Fassung bleibt erhalten' : ''}.`}</DialogDescription></DialogHeader>
        {confirmClose ? <div className="form-actions setup-actions"><Button variant="ghost" onClick={() => setConfirmClose(false)}>Weiter bearbeiten</Button><Button onClick={() => { setConfirmClose(false); setOpen(false); }}>{uncertain ? 'Später prüfen' : 'Verwerfen'}</Button></div>
          : pendingDate ? <div className="form-actions setup-actions"><Button variant="ghost" onClick={() => { setDate(sourceDate); setPendingDate(''); }}>Datum beibehalten</Button><Button onClick={() => applyDate(pendingDate)}>Werte neu übernehmen</Button></div>
          : step === 'success' ? <div className="form-actions setup-actions"><Button onClick={() => { setOpen(false); onUnderstand(); }}>Aktualisierte Einschätzung ansehen</Button></div>
          : <>
            {beyondEstimate && step === 'review' && <p className="text-sm">Die Schätzung reicht bisher bis {dateLabel(dayBefore(periodEnd(contract)))}. Für die Kostenauswirkung ab diesem Datum lege das Zeitraumende fest.</p>}
            {historical && <p className="text-sm">Diese Änderung passt die Schätzung eines vergangenen oder abgerechneten Zeitraums an. Eine erfasste Schlussabrechnung bleibt unverändert.</p>}
            {step === 'edit' ? <form noValidate onSubmit={review} className="parity-form">
              <fieldset disabled={busy || uncertain}>
                <div className="setup-field"><label htmlFor={`${prefix}-date`}>Gültig ab</label><Input id={`${prefix}-date`} type="date" value={date} readOnly={operation === 'correct'} min={operation === 'create' ? contract.period_start : undefined} max={operation === 'create' && contract.period_end ? dayBefore(contract.period_end) : undefined} onChange={event => changeDate(event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? `${prefix}-date-error` : undefined} />{errors.date && <p className="form-error" id={`${prefix}-date-error`}>{errors.date}</p>}</div>
                {fields.map(({ key, label, unit }) => <div className="setup-field" key={key}><label htmlFor={`${prefix}-${key}`}>{label}</label><InputGroup><InputGroupInput id={`${prefix}-${key}`} inputMode="decimal" value={values[key]} onChange={event => { setValues(previous => ({ ...previous, [key]: event.target.value })); setErrors(previous => ({ ...previous, [key]: undefined })); setError(''); }} placeholder={key === 'umrechnungsfaktor' ? 'z. B. 10,7123' : 'z. B. 0,00'} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${prefix}-${key}-error` : undefined} /><InputGroupAddon align="inline-end"><InputGroupText>{unit}</InputGroupText></InputGroupAddon></InputGroup>{errors[key] && <p className="form-error" id={`${prefix}-${key}-error`}>{errors[key]}</p>}</div>)}
              </fieldset>
              {following && <p className="text-sm">Die nächste Änderung ab {dateLabel(following.effective_from)} bleibt bestehen.</p>}
              <div className="form-actions setup-actions"><Button type="button" variant="ghost" onClick={close}>Abbrechen</Button><Button type="submit">Änderung prüfen</Button></div>
            </form> : <div className="parity-form">
              <p><strong>Gültig ab {dateLabel(date)}</strong>{range ? range.end ? ` bis einschließlich ${dateLabel(dayBefore(range.end))}` : ' · bis zur nächsten Änderung' : ' · wirkt sich nicht auf den gewählten Zeitraum aus.'}</p>
              {operation === 'delete' ? <p>{!range ? 'Die Einschätzung des gewählten Zeitraums bleibt unverändert.' : deletion?.predecessor ? `Danach gelten die Konditionen vom ${dateLabel(deletion.predecessor.effective_from)} in diesem Abschnitt.` : 'Dadurch entsteht hier eine Konditionslücke. Kosten und Saldo sind für den betroffenen Zeitraum nicht mehr schätzbar; bei Gas kann auch die kWh-Umrechnung fehlen.'} Der gelöschte Eintrag bleibt unter „Frühere Fassungen und Löschungen“ erhalten.</p> : <>
                <dl className="condition-values numeric">{changed.map(({ key, label, unit }) => <div key={key}><dt>{label}</dt><dd>{before ? conditionNumber(before[key], unit) : 'Nicht hinterlegt'} → <strong>{conditionNumber(setupNumber(values[key]), unit)} {unit}</strong></dd></div>)}</dl>
                {unchanged.length > 0 && <details><summary>Unverändert übernommen ({unchanged.length})</summary><dl className="condition-values numeric">{unchanged.map(({ key, label, unit }) => <div key={key}><dt>{label}</dt><dd>{conditionNumber(setupNumber(values[key]), unit)} {unit}</dd></div>)}</dl></details>}
                {following && <p className="text-sm">Spätere Konditionen bleiben unverändert.</p>}
              </>}
              <div className="form-actions setup-actions"><Button variant="ghost" disabled={busy} onClick={close}>{uncertain ? 'Später prüfen' : 'Abbrechen'}</Button>{!uncertain && operation !== 'delete' && <Button variant="outline" disabled={busy} onClick={() => setStep('edit')}>Zurück</Button>}<Button disabled={busy || conflict} onClick={save}>{busy ? 'Wird gespeichert …' : uncertain ? 'Speicherung prüfen' : operation === 'delete' ? 'Folgen bestätigen und löschen' : operation === 'correct' ? 'Korrektur speichern' : 'Neue Konditionen speichern'}</Button></div>
            </div>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {conflict && <Button variant="outline" disabled={busy} onClick={reload}>Aktuellen Stand laden</Button>}
          </>}
      </DialogContent>
    </Dialog>
  </div>;
}
