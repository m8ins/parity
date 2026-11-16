'use client';

import { useState } from 'react';
import { Button } from './ui/button';

// Deliberately no database client or custom palette editor. The only approved
// palette is the shared foundation; additional choices require a design decision.
export function DesignPanel() {
  const [palette, setPalette] = useState('wallet');
  if (process.env.NODE_ENV !== 'development') return null;
  return <details className="design-panel mt-8 text-sm">
    <summary className="cursor-pointer py-3">Designvorschau (Entwicklung)</summary>
    <label htmlFor="design-palette">Vorhandene Palette </label>
    <select id="design-palette" value={palette} onChange={event => setPalette(event.target.value)}>
      <option value="wallet">Sanftes Creme + Signalorange · Slice 1b</option>
    </select>
    <Button variant="ghost" onClick={() => setPalette('wallet')}>Zurücksetzen</Button>
  </details>;
}
