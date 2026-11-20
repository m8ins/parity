import { z } from 'zod';
import type { Reading } from './types';

export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Preserve the existing nonnegative numeric domain, including its precision.
// A dot is a German grouping separator, never a silently guessed decimal point.
export const readingSchema = z.object({
  date: z.string().refine(value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Bitte ein gültiges Ablesedatum eingeben.')
    .refine(value => value <= localToday(), 'Das Ablesedatum darf nicht in der Zukunft liegen.'),
  value: z.string().trim().regex(/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/, 'Bitte einen nichtnegativen Zählerstand mit Dezimalkomma eingeben, zum Beispiel 1.234,56.')
    .transform(value => Number(value.replaceAll('.', '').replace(',', '.')))
    .refine(value => Number.isFinite(value) && value >= 0, 'Bitte einen gültigen, nichtnegativen Zählerstand eingeben.'),
});

// Supabase numeric has no fixed decimal scale. Retain the meaningful digits
// present in the existing JS number model; do not round gas to electricity scale.
export function formatReading(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 20 });
}

export function formatReadingDate(date: string) {
  return new Intl.DateTimeFormat('de-DE').format(new Date(`${date}T12:00:00`));
}

export function latestReading(readings: Reading[]) {
  return readings.reduce<Reading | undefined>((latest, reading) =>
    !latest || reading.date > latest.date ||
    (reading.date === latest.date && reading.created_at >= latest.created_at) ? reading : latest, undefined);
}
