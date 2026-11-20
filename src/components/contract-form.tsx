"use client"

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/date-utils'
import { initialSetupValues, localToday, setupPayload, setupStepFields, validateSetup, type SetupValues } from '@/lib/meter-setup'

type Draft = { values: SetupValues; requestId: string; submitted: boolean; step: number }

export function ContractForm({ user_id, onSuccess, onCancel, onProtectionChange }: {
  user_id: string; onSuccess?: () => void; onCancel?: () => void;
  onProtectionChange?: (dirty: boolean, pending: boolean, unconfirmed: boolean) => void;
}) {
  const [values, setValues] = useState(initialSetupValues)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Partial<Record<keyof SetupValues, string>>>({})
  const [loading, setLoading] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [storageReady, setStorageReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const requestId = useRef('')
  const inFlight = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const storageKey = `parity:meter-setup:${user_id}`
  const dirty = Object.entries(values).some(([key, value]) => value !== initialSetupValues()[key as keyof SetupValues])

  useEffect(() => {
    requestId.current = crypto.randomUUID()
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) {
        const draft = JSON.parse(raw) as Draft
        if (draft.requestId && draft.values && typeof draft.step === 'number') {
          requestId.current = draft.requestId
          setValues(draft.values)
          setStep(draft.submitted ? 2 : Math.min(2, Math.max(0, draft.step)))
          setUncertain(draft.submitted)
          if (draft.submitted) setError('Eine frühere Speicherung ist noch nicht bestätigt. Prüfe denselben Auftrag erneut; es wird kein zweiter Zähler angelegt.')
        }
      }
    } catch { setStorageError(true) }
    setStorageReady(true)
  }, [storageKey])

  useEffect(() => { onProtectionChange?.(!success && (dirty || uncertain), loading, uncertain) }, [dirty, loading, onProtectionChange, success, uncertain])
  useEffect(() => {
    if (!dirty && !uncertain) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty, uncertain])

  function change(key: keyof SetupValues, value: string) {
    setValues(previous => ({ ...previous, [key]: value, ...(key === 'type' ? { umrechnungsfaktor: value === 'gas' ? '' : '1' } : {}) }))
    setErrors(previous => ({ ...previous, [key]: undefined }))
  }
  function goTo(next: number) {
    setStep(next)
    setErrors({})
    requestAnimationFrame(() => heading.current?.focus())
  }
  function check(keys: (keyof SetupValues)[]) {
    const all = validateSetup(values)
    const selected = Object.fromEntries(keys.filter(key => all[key]).map(key => [key, all[key]]))
    setErrors(selected)
    const first = keys.find(key => all[key])
    if (first) requestAnimationFrame(() => document.getElementById(`setup-${first}`)?.focus())
    return !first
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current || !storageReady || success) return
    if (step < 2) {
      if (check(setupStepFields[step])) goTo(step + 1)
      return
    }
    if (!uncertain) {
      const all = validateSetup(values)
      const badStep = setupStepFields.findIndex(keys => keys.some(key => all[key]))
      if (badStep >= 0) { setStep(badStep); check(setupStepFields[badStep]); return }
    }
    // Persist the exact request before sending. A reload can recover a committed
    // transaction whose response was lost, using the same account-bound key.
    try {
      const draft: Draft = { values, requestId: requestId.current, submitted: true, step: 2 }
      sessionStorage.setItem(storageKey, JSON.stringify(draft))
      setStorageError(false)
    } catch {
      setStorageError(true)
      setError('Der Wiederholschutz konnte nicht gespeichert werden. Erlaube Sitzungsspeicher im Browser und versuche es erneut. Es wurde nichts gesendet.')
      return
    }
    inFlight.current = true
    setLoading(true)
    setError('')
    setUncertain(true)
    try {
      const result = await createClient().rpc('setup_meter', { p_request_id: requestId.current, p_payload: setupPayload(values) })
      if (result.error) throw result.error
      if (!result.data) throw new Error('Keine Speicherbestätigung')
      setSuccess(true)
      setUncertain(false)
      try { sessionStorage.removeItem(storageKey) } catch { /* committed outcome remains recoverable by the same receipt */ }
      requestAnimationFrame(() => heading.current?.focus())
    } catch {
      setError('Die Speicherung ist noch nicht bestätigt. Deine Angaben bleiben erhalten. Mit „Speicherung prüfen“ wird derselbe Auftrag sicher wiederholt. Wenn der Fehler bleibt, prüfe deine Verbindung oder melde dich erneut an.')
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }
  function field(key: keyof SetupValues, label: string, options: { type?: string; unit?: string; hint?: string; optional?: boolean; placeholder?: string } = {}) {
    const props = { id: `setup-${key}`, value: values[key], onChange: (event: React.ChangeEvent<HTMLInputElement>) => change(key, event.target.value),
      type: options.type || 'text', inputMode: options.unit ? 'decimal' as const : undefined,
      'aria-invalid': Boolean(errors[key]), 'aria-describedby': [options.hint ? `setup-${key}-hint` : '', errors[key] ? `setup-${key}-error` : ''].filter(Boolean).join(' ') || undefined,
      max: options.type === 'date' && key !== 'period_end' ? localToday() : undefined, placeholder: options.placeholder }
    return <div className="setup-field" key={key}>
      <label htmlFor={props.id}>{label}{options.optional ? ' (optional)' : ''}</label>
      {options.unit ? <InputGroup><InputGroupInput {...props} /><InputGroupAddon align="inline-end"><InputGroupText>{options.unit}</InputGroupText></InputGroupAddon></InputGroup> : <Input {...props} />}
      {options.hint && <p className="text-sm text-muted-foreground" id={`setup-${key}-hint`}>{options.hint}</p>}
      {errors[key] && <p className="form-error" id={`setup-${key}-error`}>{errors[key]}</p>}
    </div>
  }
  if (success) return <div className="parity-form setup-success" role="status">
    <h2 ref={heading} tabIndex={-1}>Dein Zähler ist eingerichtet</h2>
    <p><strong>{values.name}</strong> hat jetzt einen Abrechnungszeitraum, Konditionen und einen Anfangsstand von {values.reading_value} {values.type === 'gas' ? 'm³' : 'kWh'}.</p>
    <p>Den nächsten Stand erfasst du in der Übersicht mit „Stand erfassen“. Für eine Prognose brauchst du mindestens zwei Ablesungen im Zeitraum.</p>
    <Button onClick={onSuccess}>Zur Übersicht</Button>
  </div>

  return <form onSubmit={submit} className="parity-form meter-setup" aria-busy={loading} noValidate>
    <p className="text-sm text-muted-foreground">Schritt {step + 1} von 3 · {['Zähler', 'Zeitraum und Konditionen', 'Anfangsablesung'][step]}</p>
    <h2 ref={heading} tabIndex={-1}>{['Welchen Zähler möchtest du einrichten?', 'Was gilt zu Beginn?', 'Mit welchem Stand startest du?'][step]}</h2>
    {uncertain && !loading && <p className="text-sm">Die Angaben bleiben bis zur Speicherbestätigung geschützt, damit eine Wiederholung keinen anderen Auftrag sendet.</p>}
    <fieldset disabled={loading || uncertain}>
      {step === 0 && <>
        {field('name', 'Name', { placeholder: 'z. B. Strom Wohnung', hint: 'Ein eindeutiger Name hilft dir später, den richtigen Zähler zu finden.' })}
        <div className="setup-field"><label id="setup-type-label" htmlFor="setup-type">Zählertyp</label>
          <Select value={values.type} onValueChange={value => change('type', value)}><SelectTrigger id="setup-type" aria-labelledby="setup-type-label"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="electricity">Strom</SelectItem><SelectItem value="gas">Gas</SelectItem></SelectContent></Select>
          <p className="text-sm text-muted-foreground">{values.type === 'gas' ? 'Gasstände werden in m³ erfasst und für Kosten in kWh umgerechnet.' : 'Stromstände werden in kWh erfasst.'}</p>
        </div>
      </>}
      {step === 1 && <>
        <p>Übernimm die Angaben aus deinem Vertrag oder der Abrechnung. Die Konditionen gelten ab dem Beginn dieses Zeitraums.</p>
        {field('provider', 'Anbieter', { optional: true, placeholder: 'z. B. Stadtwerke' })}
        {field('period_start', 'Beginn des Abrechnungszeitraums', { type: 'date' })}
        {field('period_end', 'Ende des Abrechnungszeitraums', { type: 'date', optional: true, hint: 'Jede Dauer ist möglich. Das Enddatum ist der Beginn der nächsten Periode (z. B. 01.01. für die Abrechnung bis 31.12.). Unbekannt? Lass es offen.' })}
        {field('grundpreis', 'Grundpreis', { unit: '€/Monat', placeholder: 'z. B. 12,50' })}
        {field('arbeitspreis', 'Arbeitspreis', { unit: 'ct/kWh', placeholder: 'z. B. 32,45' })}
        {field('abschlag', 'Abschlag', { unit: '€/Monat', placeholder: 'z. B. 85', hint: 'Trage 0 ein, wenn du keinen monatlichen Abschlag zahlst. Leere Felder werden nicht als 0 gespeichert.' })}
        {values.type === 'gas' && field('umrechnungsfaktor', 'Umrechnungsfaktor', { unit: 'kWh/m³', placeholder: 'z. B. 10,7', hint: 'Brennwert × Zustandszahl aus deiner Gasabrechnung. Kein geschätzter Wert wird automatisch eingetragen.' })}
      </>}
      {step === 2 && <>
        <p>Nutze einen abgelesenen Stand innerhalb des Zeitraums. Er bildet die Basis für deinen späteren Verbrauch.</p>
        {field('reading_date', 'Datum der Anfangsablesung', { type: 'date' })}
        {field('reading_value', 'Anfangszählerstand', { unit: values.type === 'gas' ? 'm³' : 'kWh', placeholder: 'z. B. 12345,6' })}
        <div className="setup-summary"><h3>Das wird angelegt</h3><dl>
          <dt>Zähler</dt><dd>{values.name} · {values.type === 'gas' ? 'Gas' : 'Strom'}</dd>
          <dt>Zeitraum</dt><dd>{formatDate(values.period_start, 'de-DE')} bis {values.period_end ? formatDate(values.period_end, 'de-DE') + ' (Beginn nächste Periode)' : 'offen'}{values.provider ? ` · ${values.provider}` : ''}</dd>
          <dt>Konditionen ab Beginn</dt><dd>{values.grundpreis} €/Monat Grundpreis · {values.arbeitspreis} ct/kWh · {values.abschlag} €/Monat Abschlag</dd>
          {values.type === 'gas' && <><dt>Gasumrechnung</dt><dd>{values.umrechnungsfaktor} kWh/m³</dd></>}
        </dl></div>
      </>}
    </fieldset>
    {storageError && !error && <p className="text-sm">Sitzungsspeicher ist nicht verfügbar. Zum sicheren Speichern muss er im Browser erlaubt sein.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions setup-actions">
      {onCancel && <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>{uncertain ? 'Später prüfen' : 'Abbrechen'}</Button>}
      {step > 0 && !uncertain && <Button type="button" variant="outline" disabled={loading} onClick={() => goTo(step - 1)}>Zurück</Button>}
      <Button type="submit" disabled={loading || !storageReady}>{loading ? 'Wird gespeichert…' : uncertain ? 'Speicherung prüfen' : step < 2 ? 'Weiter' : 'Zähler anlegen'}</Button>
    </div>
  </form>
}
