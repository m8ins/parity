'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Check, Flame, X, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MeterManagementError, renameMeter } from '@/lib/meter-management';
import type { Meter } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function InlineMeterName({ meter, editing, onEditingChange, onSaved, triggerRef }: {
  meter: Meter; editing: boolean; onEditingChange: (editing: boolean) => void; onSaved: (meter: Meter) => void; triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const [name, setName] = useState(meter.name);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) { input.current?.focus(); input.current?.select(); }
  }, [editing]);
  useEffect(() => {
    if (!editing || name === meter.name) return;
    const protect = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [editing, name, meter.name]);
  function close() {
    if (busy.current) return;
    onEditingChange(false); setError('');
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (name.trim().length < 2) { setError('Bitte mindestens 2 Zeichen eingeben.'); input.current?.focus(); return; }
    if (name.trim() === meter.name) { close(); return; }
    busy.current = true; setPending(true); setError('');
    try {
      const saved = await renameMeter(createClient(), meter, name);
      onSaved(saved); busy.current = false; close();
    } catch (cause) {
      setError(cause instanceof MeterManagementError ? cause.message : 'Der Name konnte nicht gespeichert werden. Bitte versuche es erneut.');
    } finally { busy.current = false; setPending(false); }
  }
  const TypeIcon = meter.type === 'gas' ? Flame : Zap;
  return <div className="detail-name">
    <TypeIcon className="detail-type-icon" aria-label={meter.type === 'gas' ? 'Gas' : 'Strom'} />
    <h1 aria-label={meter.name} className={editing ? 'sr-only' : undefined}>
      {editing ? meter.name : <button ref={triggerRef} className="detail-name-trigger" aria-label={`${meter.name} umbenennen`} onClick={() => { setName(meter.name); setError(''); onEditingChange(true); }}>{meter.name}</button>}
    </h1>
    {editing && <form className="detail-name-form" onSubmit={save} aria-busy={pending} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
      <div className="detail-name-controls">
        <Input ref={input} aria-label="Zählername" value={name} onChange={event => setName(event.target.value)} disabled={pending} aria-invalid={!!error} aria-describedby={error ? `rename-error-${meter.id}` : undefined} />
        <Button type="submit" variant="ghost" size="icon" disabled={pending} aria-label={pending ? 'Name wird gespeichert' : 'Name speichern'}><Check aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={close} aria-label="Umbenennen abbrechen"><X aria-hidden="true" /></Button>
      </div>
      {error && <p id={`rename-error-${meter.id}`} className="form-error" role="alert">{error}</p>}
    </form>}
  </div>;
}
