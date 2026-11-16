'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MeterType, Reading } from '@/lib/types';
import { formatReading, localToday, readingSchema } from '@/lib/readings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function ReadingDialog({
  meterId, meterName = 'Zähler', meterType = 'electricity', lastReadingValue,
  lastReading, children, onSuccess,
}: {
  meterId: string;
  meterName?: string;
  meterType?: MeterType;
  lastReadingValue?: number;
  lastReading?: Reading;
  children: React.ReactNode;
  onSuccess?: (reading: Reading) => void;
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [date, setDate] = useState(localToday);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ date?: string; value?: string; save?: string }>({});
  const [keyboard, setKeyboard] = useState(false);
  const [viewport, setViewport] = useState<CSSProperties>({});
  const saving = useRef(false);
  const initialDate = useRef(date);
  const initialValue = useRef('');
  const dateRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const suppressHandleClick = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const unit = meterType === 'gas' ? 'm³' : 'kWh';
  const previousValue = lastReading?.value ?? lastReadingValue;
  const dirty = value !== initialValue.current || date !== initialDate.current;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Tab') setKeyboard(true); };
    const onPointer = () => setKeyboard(false);
    const updateViewport = () => {
      const vv = window.visualViewport;
      if (vv) setViewport({
        '--reading-viewport-height': `${vv.height}px`,
        '--reading-keyboard-inset': `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`,
      } as CSSProperties);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    updateViewport();
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, [open]);

  function requestClose() {
    if (saving.current) return;
    if (dirty) setDiscard(true);
    else setOpen(false);
  }

  function changeOpen(next: boolean) {
    if (!next) return requestClose();
    const today = localToday();
    initialDate.current = today;
    setDate(today);
    initialValue.current = previousValue === undefined ? '' : formatReading(previousValue);
    setValue(initialValue.current);
    setErrors({});
    setDiscard(false);
    setKeyboard(document.activeElement?.matches(':focus-visible') ?? false);
    setDragOffset(0);
    setOpen(true);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    drag.current = null;
    setDragOffset(0);
    if (start?.id !== event.pointerId) return;
    const dy = event.clientY - start.y;
    suppressHandleClick.current = Math.abs(dy) > 10 || Math.abs(event.clientX - start.x) > 10;
    if (dy >= 64 && dy > Math.abs(event.clientX - start.x) * 1.5) requestClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    const result = readingSchema.safeParse({ date, value });
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setErrors({ date: fields.date?.[0], value: fields.value?.[0] });
      (fields.date ? dateRef : valueRef).current?.focus();
      return;
    }
    saving.current = true;
    setLoading(true);
    setErrors({});
    let saved: Reading | undefined;
    try {
      const { data, error } = await createClient().from('readings')
        .insert({ meter_id: meterId, ...result.data }).select().single();
      if (error || !data) throw error ?? new Error('Missing reading');
      saved = data as Reading;
    } catch {
      setErrors({ save: 'Der Zählerstand konnte nicht gespeichert werden. Bitte die Verbindung prüfen und erneut speichern.' });
    } finally {
      saving.current = false;
      setLoading(false);
    }
    if (saved) {
      setOpen(false);
      onSuccess?.(saved);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent presentation="reading" className="reading-dialog" aria-describedby={undefined} data-keyboard={keyboard} style={{ ...viewport, "--sheet-drag-offset": `${dragOffset}px` } as CSSProperties} showCloseButton={false}
        onPointerDownOutside={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
        onEscapeKeyDown={event => { event.preventDefault(); requestClose(); }}
        onOpenAutoFocus={event => { event.preventDefault(); valueRef.current?.focus(); valueRef.current?.select(); }}>
        <button type="button" className="sheet-handle" aria-label="Erfassung schließen – nach unten ziehen oder tippen"
          disabled={loading} onClick={() => { if (!suppressHandleClick.current) requestClose(); suppressHandleClick.current = false; }}
          onPointerDown={event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            suppressHandleClick.current = false;
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }} onPointerMove={event => {
            if (drag.current?.id === event.pointerId) setDragOffset(Math.max(0, event.clientY - drag.current.y));
          }} onPointerUp={endDrag} onPointerCancel={() => { drag.current = null; setDragOffset(0); }} />
        <DialogHeader>
          <DialogTitle>Zählerstand für {meterName}</DialogTitle>
        </DialogHeader>
        <form className="reading-form" onSubmit={submit} noValidate aria-busy={loading}>
          <div className="reading-field">
            <label htmlFor={`date-${meterId}`}>Ablesedatum</label>
            <Input ref={dateRef} className="reading-input" id={`date-${meterId}`} type="date" value={date} max={localToday()}
              readOnly={loading} onChange={event => { if (!saving.current) setDate(event.target.value); }}
              aria-invalid={!!errors.date} aria-describedby={errors.date ? `date-error-${meterId}` : undefined} />
            {errors.date && <p className="reading-error" id={`date-error-${meterId}`}>{errors.date}</p>}
          </div>
          <div className="reading-field">
            <label htmlFor={`value-${meterId}`}>Neuer Zählerstand ({unit})</label>
            <div className="reading-value">
              <Input ref={valueRef} className="reading-input" id={`value-${meterId}`} type="text" inputMode="decimal" autoComplete="off"
                value={value} placeholder={meterType === 'gas' ? '8.412,365' : '24.681,7'} readOnly={loading}
                onChange={event => { if (!saving.current) setValue(event.target.value); }}
                aria-invalid={!!errors.value} aria-describedby={`value-hint-${meterId}${errors.value ? ` value-error-${meterId}` : ''}`} />
              <span className="reading-unit" aria-hidden="true">{unit}</span>
            </div>
            <p className="reading-hint" id={`value-hint-${meterId}`}>Den Stand in {unit} ablesen. Nachkommastellen mit Komma eingeben.</p>
            {errors.value && <p className="reading-error" id={`value-error-${meterId}`}>{errors.value}</p>}
          </div>
          {errors.save && <p role="alert" className="reading-error">{errors.save}</p>}
          <div className="reading-actions">
            <Button type="submit" className="parity-button" disabled={loading}>
              {loading ? 'Wird gespeichert …' : errors.save ? 'Erneut speichern' : 'Zählerstand speichern'}
            </Button>
            <Button type="button" variant="ghost" disabled={loading} onClick={() => { if (!suppressHandleClick.current) requestClose(); suppressHandleClick.current = false; }}>Abbrechen</Button>
          </div>
          <span className="sr-only" role="status">{loading ? 'Zählerstand wird gespeichert.' : ''}</span>
        </form>
        <Dialog open={discard} onOpenChange={setDiscard}>
          <DialogContent className="reading-discard" showCloseButton={false} onPointerDownOutside={event => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Eingaben verwerfen?</DialogTitle>
              <DialogDescription>Dein Zählerstand wurde noch nicht gespeichert.</DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={() => setDiscard(false)} autoFocus>Weiter erfassen</Button>
            <Button onClick={() => { setDiscard(false); setOpen(false); }}>Eingaben verwerfen</Button>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
