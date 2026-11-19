import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AuthScreen } from '@/components/auth-screen';
import { RouteState } from '@/components/RouteState';
import { isMissingSession, isObjectId } from '@/lib/access';

// Legacy contract IDs denote billing periods, never meter IDs.
export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isMissingSession(authError)) throw authError;
  if (!user) return <AuthScreen notice="Bitte melde dich an, um diesen Zeitraum zu öffnen." />;
  const { id } = await params;
  if (!isObjectId(id)) return <RouteState title="Zeitraum nicht verfügbar" />;
  const { data, error } = await supabase.from('contracts').select('id,meter_id').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return <RouteState title="Zeitraum nicht verfügbar" />;
  redirect(`/meter/${data.meter_id}?period=${data.id}`);
}
