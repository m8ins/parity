'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <main className="parity-page parity-form" role="alert">
    <h1>Daten konnten nicht geladen werden</h1>
    <p>Bitte prüfe deine Verbindung und lade erneut. Deine gespeicherten Daten bleiben erhalten.</p>
    <div className="form-actions setup-actions"><Button disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset(); })}>{pending ? 'Wird geladen …' : 'Erneut laden'}</Button><Button variant="outline" asChild><Link href="/">Zur Zählerübersicht</Link></Button></div>
  </main>;
}
