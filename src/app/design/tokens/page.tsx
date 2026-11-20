import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Development-only catalogue. Names come from the source; values stay in CSS.
export default async function TokenPreview() {
  if (process.env.NODE_ENV !== 'development' || process.env.PARITY_DESIGN_PREVIEW !== '1') notFound();
  const source = await readFile(join(process.cwd(), 'src/app/foundation.tokens.css'), 'utf8');
  const names = [...source.matchAll(/^\s*(--[\w-]+):/gm)].map(match => match[1]);
  const groups = [
    ['Primitive Colors', names.filter(name => name.startsWith('--ref-color-'))],
    ['Semantic Colors', names.filter(name => name.startsWith('--sys-color-'))],
    ['Component Colors', names.filter(name => name.startsWith('--cmp-'))],
  ] as const;
  return <main className="parity-page space-y-8">
    <h1>Token-System</h1>
    <p>Primitive → Semantic → Component. Werte und Namen aus foundation.tokens.css.</p>
    <section className="space-y-4" aria-label="Komponentenzustände">
      <h2 className="text-lg font-bold">Buttons und Formularfelder</h2>
      {(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const).map(variant => <div key={variant} className="flex flex-wrap items-center gap-4">
        <Button variant={variant} data-preview={variant}>{variant}</Button>
        <Button variant={variant} disabled>{variant} · deaktiviert</Button>
      </div>)}
      <div className="grid gap-4 sm:grid-cols-3">
        <label>Normal<Input placeholder="Beispielwert" /></label>
        <label>Fehler<Input aria-invalid="true" defaultValue="Ungültiger Wert" /></label>
        <label>Deaktiviert<Input disabled defaultValue="Gespeicherter Wert" /></label>
      </div>
    </section>
    <section className="space-y-4" aria-label="Statusflächen">
      <h2 className="text-lg font-bold">Utility und Knockout</h2>
      {(['error', 'warning', 'success', 'info'] as const).map(role => <div key={role} className="grid gap-4 sm:grid-cols-2">
        {['', '-knockout'].map(suffix => <p key={suffix} data-utility={`${role}${suffix}`} className="rounded-lg border-2 p-4" style={{
          background: `var(--sys-color-background-utility-${role}${suffix})`,
          color: suffix ? 'var(--sys-color-content-on-knockout)' : `var(--sys-color-content-utility-${role})`,
          borderColor: `var(--sys-color-border-utility-${role})`,
        }}>{role}{suffix} · Beispiel einer Statusmeldung</p>)}
      </div>)}
    </section>
    {groups.map(([title, tokens]) => <details key={title} open={title === 'Semantic Colors'} className="border-t pt-4">
      <summary className="cursor-pointer text-lg font-bold">{title} ({tokens.length})</summary>
      <dl className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {tokens.map(name => <div key={name} className="min-w-0 space-y-2">
          <dt className="break-all text-sm">{name}</dt>
          <dd aria-label={name} className="h-12 rounded-lg border" style={{ background: `var(${name})` }} />
        </div>)}
      </dl>
    </details>)}
    <section className="space-y-4">
      <h2 className="text-lg font-bold">Spacing und Radius</h2>
      {names.filter(name => /^--ref-space-/.test(name)).map(name => <div key={name} className="space-y-2">
        <p className="text-sm">{name}</p><div style={{ width: `var(${name})`, height: 'var(--ref-space-3)', background: 'var(--sys-color-content-primary)' }} />
      </div>)}
      <div className="flex flex-wrap gap-4">{['control', 'surface'].map(role => <div key={role} className="border-2 p-6" style={{ borderRadius: `var(--sys-radius-${role})` }}>radius/{role}</div>)}</div>
    </section>
  </main>;
}
