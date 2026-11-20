'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export function RouteState({ title = 'Zähler nicht verfügbar', children, retry = false, href = '/', label = 'Zur Zählerübersicht' }: { title?: string; children?: React.ReactNode; retry?: boolean; href?: string; label?: string }) {
  const router = useRouter();
  return <main className="parity-page parity-form">
    <h1>{title}</h1>
    <p>{children ?? 'Dieser Zähler wurde entfernt oder ist für dein Konto nicht zugänglich.'}</p>
    <div className="form-actions setup-actions">
      {retry && <Button onClick={() => router.refresh()}>Erneut laden</Button>}
      <Button variant="outline" asChild><Link href={href}>{label}</Link></Button>
    </div>
  </main>;
}
