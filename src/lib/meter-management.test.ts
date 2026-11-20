import { describe, it, expect, vi } from 'vitest';
import { renameMeter, removeMeter } from './meter-management';
import type { Meter } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
const meter = { id: 'm1', user_id: 'u1', name: 'Strom' } as Meter;
function fixture(user: string | null = 'u1') {
  const single = vi.fn().mockResolvedValue({ data: { ...meter, name: 'Neuer Name' }, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const result = { error: null, select: () => ({ single }) };
  const update = vi.fn(() => ({ eq: () => result }));
  const deletion = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const from = vi.fn(() => ({ update, delete: deletion, select: () => ({ eq: () => ({ maybeSingle }) }) }));
  const getUser = vi.fn().mockResolvedValue({ data: { user: user ? { id: user } : null }, error: null });
  return { client: { auth: { getUser }, from } as unknown as SupabaseClient, getUser, single, maybeSingle, update, deletion, from };
}
describe('Zählerverwaltung', () => {
  it('verwendet bestehende Namensregel und übernimmt ausschließlich bestätigte Serverdaten', async () => {
    const f = fixture();
    await expect(renameMeter(f.client, meter, ' x ')).rejects.toThrow('mindestens 2');
    expect(f.update).not.toHaveBeenCalled();
    expect(await renameMeter(f.client, meter, ' Neuer Name ')).toEqual({ ...meter, name: 'Neuer Name' });
    expect(f.update).toHaveBeenCalledWith({ name: 'Neuer Name' });
  });
  it('meldet fehlende Update-Zeile als Fehler und erlaubt dieselbe Wiederholung', async () => {
    const f = fixture(); f.single.mockResolvedValueOnce({ data: null, error: null });
    await expect(renameMeter(f.client, meter, 'Neuer Name')).rejects.toThrow('nicht bestätigt');
    await expect(renameMeter(f.client, meter, 'Neuer Name')).resolves.toHaveProperty('name', 'Neuer Name');
  });
  it.each([null, 'anderes-konto'])('verhindert alle Mutationen bei Sitzung %s', async account => {
    const f = fixture(account);
    await expect(renameMeter(f.client, meter, 'Neu')).rejects.toThrow('Sitzung');
    await expect(removeMeter(f.client, meter)).rejects.toThrow('Sitzung');
    expect(f.from).not.toHaveBeenCalled();
  });
  it('bestätigt Löschung erst durch erfolgreichen Abwesenheitsabruf, auch bei Wiederholung', async () => {
    const f = fixture(); f.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await expect(removeMeter(f.client, meter)).rejects.toThrow('nicht bestätigt');
    await expect(removeMeter(f.client, meter)).resolves.toBeUndefined();
    expect(f.deletion).toHaveBeenCalledTimes(2);
  });
  it('zeigt keinen Erfolg bei fehlgeschlagener Löschung oder verbleibender Zeile', async () => {
    const f = fixture(); f.deletion.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: { message: 'failed' } }) });
    await expect(removeMeter(f.client, meter)).rejects.toThrow('nicht bestätigt');
    expect(f.maybeSingle).not.toHaveBeenCalled();
    f.maybeSingle.mockResolvedValueOnce({ data: meter, error: null });
    await expect(removeMeter(f.client, meter)).rejects.toThrow('nicht bestätigt');
  });
});
