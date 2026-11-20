import { ContractDetail } from '@/components/contract-detail';
import { AuthScreen } from '@/components/auth-screen';
import { RouteState } from '@/components/RouteState';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadMeterData } from '@/lib/contracts';
import { isMissingSession, isObjectId } from '@/lib/access';

export default async function MeterDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isMissingSession(authError)) throw authError;
  if (!user) return <AuthScreen notice="Deine Sitzung fehlt oder ist abgelaufen. Melde dich an, um diesen Zähler zu öffnen." />;
  const { id } = await params;
  const { period } = await searchParams;
  if (!isObjectId(id)) return <RouteState />;
  const { data: meter, error } = await supabase.from('meters').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!meter) return <RouteState />;
  const data = await loadMeterData(supabase, id);
  if (period !== undefined && (!isObjectId(period) || !data.contracts.some(item => item.id === period))) {
    return <RouteState title="Zeitraum nicht verfügbar" href={`/meter/${id}`} label="Zum aktuellen Zeitraum">Dieser Zeitraum wurde entfernt oder ist für diesen Zähler nicht zugänglich.</RouteState>;
  }
  return <ContractDetail key={`${user.id}:${id}`} initialMeter={meter} initialData={data} initialContractId={period} />;
}
