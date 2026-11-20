import type { SupabaseClient } from '@supabase/supabase-js';
import { isMissingSession } from './access';
import type { Meter } from './types';

export class MeterManagementError extends Error {}

export async function requireMeterOwner(client: SupabaseClient, meter: Meter) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error && !isMissingSession(error)) throw new MeterManagementError('Die Sitzung konnte nicht geprüft werden. Bitte prüfe deine Verbindung und versuche es erneut.');
  if (error || !user || user.id !== meter.user_id) throw new MeterManagementError('Deine Sitzung ist nicht mehr gültig für diesen Zähler. Bitte melde dich erneut an.');
}

export async function renameMeter(client: SupabaseClient, meter: Meter, value: string): Promise<Meter> {
  const name = value.trim();
  if (name.length < 2) throw new MeterManagementError('Bitte einen Namen mit mindestens 2 Zeichen eingeben.');
  await requireMeterOwner(client, meter);
  const { data, error } = await client.from('meters').update({ name }).eq('id', meter.id).select('*').single();
  if (error || !data) throw new MeterManagementError('Der Name konnte nicht bestätigt werden. Deine Eingabe bleibt erhalten. Bitte versuche es erneut.');
  return data;
}

// Absolute target (absent), safe to repeat after a lost response. RLS and an
// independently validated account are required before interpreting absence.
export async function removeMeter(client: SupabaseClient, meter: Meter) {
  await requireMeterOwner(client, meter);
  const { error } = await client.from('meters').delete().eq('id', meter.id);
  if (error) throw new MeterManagementError('Die Löschung konnte nicht bestätigt werden. Bitte prüfe die Löschung erneut.');
  const { data, error: readError } = await client.from('meters').select('id').eq('id', meter.id).maybeSingle();
  if (readError || data) throw new MeterManagementError('Die Löschung konnte nicht bestätigt werden. Bitte prüfe die Löschung erneut.');
}
