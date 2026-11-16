import { readingSchema } from './readings';

export interface SetupValues {
  name: string; type: 'electricity' | 'gas'; provider: string;
  period_start: string; period_end: string;
  grundpreis: string; arbeitspreis: string; abschlag: string; umrechnungsfaktor: string;
  reading_date: string; reading_value: string;
}
export const setupStepFields: (keyof SetupValues)[][] = [
  ['name', 'type'],
  ['provider', 'period_start', 'period_end', 'grundpreis', 'arbeitspreis', 'abschlag', 'umrechnungsfaktor'],
  ['reading_date', 'reading_value'],
];
export function localToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function initialSetupValues(): SetupValues {
  return { name: '', type: 'electricity', provider: '', period_start: '', period_end: '', grundpreis: '', arbeitspreis: '', abschlag: '', umrechnungsfaktor: '1', reading_date: localToday(), reading_value: '' };
}
export function setupNumber(value: string) {
  const result = readingSchema.shape.value.safeParse(value);
  return result.success ? result.data : NaN;
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateSetup(values: SetupValues, today = localToday()) {
  const errors: Partial<Record<keyof SetupValues, string>> = {};
  if (values.name.trim().length < 2) errors.name = 'Bitte einen Namen mit mindestens 2 Zeichen eingeben.';
  if (!['electricity', 'gas'].includes(values.type)) errors.type = 'Bitte Strom oder Gas wählen.';
  if (!validDate(values.period_start)) errors.period_start = 'Bitte ein gültiges Anfangsdatum eingeben.';
  else if (values.period_start > today) errors.period_start = 'Der Beginn darf nicht in der Zukunft liegen.';
  if (values.period_end && (!validDate(values.period_end) || values.period_end <= values.period_start)) errors.period_end = 'Das Ende muss nach dem Beginn liegen.';
  for (const key of ['grundpreis', 'arbeitspreis', 'abschlag', 'reading_value'] as const) {
    if (!Number.isFinite(setupNumber(values[key]))) errors[key] = 'Bitte eine Zahl ab 0 eingeben. Auch 0 ist möglich.';
  }
  if (values.type === 'gas' && (!Number.isFinite(setupNumber(values.umrechnungsfaktor)) || setupNumber(values.umrechnungsfaktor) <= 0)) errors.umrechnungsfaktor = 'Bitte einen Umrechnungsfaktor größer als 0 eingeben.';
  if (!validDate(values.reading_date)) errors.reading_date = 'Bitte ein gültiges Ablesedatum eingeben.';
  else if (values.reading_date > today) errors.reading_date = 'Das Ablesedatum darf nicht in der Zukunft liegen.';
  else if (validDate(values.period_start) && values.reading_date < values.period_start) errors.reading_date = 'Die Anfangsablesung muss im Abrechnungszeitraum liegen.';
  else if (values.period_end && values.reading_date > values.period_end) errors.reading_date = 'Die Anfangsablesung muss spätestens am Ende des Zeitraums liegen.';
  return errors;
}
export function setupPayload(values: SetupValues) {
  return { ...values, name: values.name.trim(), provider: values.provider.trim(), period_end: values.period_end || null,
    grundpreis: setupNumber(values.grundpreis), arbeitspreis: setupNumber(values.arbeitspreis), abschlag: setupNumber(values.abschlag),
    umrechnungsfaktor: values.type === 'gas' ? setupNumber(values.umrechnungsfaktor) : 1, reading_value: setupNumber(values.reading_value) };
}
