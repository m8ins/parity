'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RouteState } from './RouteState';
import { createClient } from '@/lib/supabase/client';

// A full server reload clears RSC cache and all account-dependent local forms.
// Account-scoped sessionStorage receipts intentionally survive for safe replay.
export function AccountBoundary({ initialUserId, previewEnabled = false, children }: { initialUserId: string | null | undefined; previewEnabled?: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const isPreview = previewEnabled && pathname.startsWith('/design/');
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (isPreview || initialUserId === undefined) return;
    const client = createClient();
    let active = true;
    const check = (id: string | null) => { if (active && id !== initialUserId) setChanged(true); };
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => check(session?.user.id ?? null));
    client.auth.getSession().then(({ data: { session } }) => check(session?.user.id ?? null));
    return () => { active = false; subscription.unsubscribe(); };
  }, [initialUserId, isPreview]);
  useEffect(() => { if (changed) window.location.reload(); }, [changed]);
  if (initialUserId === undefined && !isPreview) return <RouteState title="Sitzung konnte nicht geprüft werden" retry>Bitte prüfe deine Verbindung und lade erneut. Deine gespeicherten Daten bleiben erhalten.</RouteState>;
  return changed ? <main className="parity-page" role="status">Deine Sitzung hat sich geändert. Die Ansicht wird neu geladen …</main> : children;
}
