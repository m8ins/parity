'use client';

import { formatDate } from '@/lib/date-utils';
import { useLocale } from '@/lib/locale';
import { useId, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Rate } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Trash2 } from 'lucide-react';

export function RateHistory({ contractId, initialData, isGas }: { contractId: string; initialData: Rate[]; isGas: boolean }) {
  const [rates, setRates] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const supabase = createClient();
  const locale = useLocale();
  const prefix = useId();
  const [values, setValues] = useState({ date: '', grundpreis: '', arbeitspreis: '', abschlag: '', umrechnungsfaktor: isGas ? '10' : '1' });
  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (!values.date || !values.grundpreis || !values.arbeitspreis || !values.abschlag) { setError('Bitte Gültigkeitsdatum, Grundpreis, Arbeitspreis und Abschlag eingeben.'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      const { data, error } = await supabase.from('rates').insert({
        contract_id: contractId, effective_from: values.date,
        grundpreis: parseFloat(values.grundpreis), arbeitspreis: parseFloat(values.arbeitspreis),
        abschlag: parseFloat(values.abschlag), umrechnungsfaktor: isGas ? parseFloat(values.umrechnungsfaktor) : 1,
      }).select().single();
      if (error || !data) throw error;
      setRates([...rates, data as Rate].sort((a, b) => new Date(a.effective_from).getTime() - new Date(b.effective_from).getTime()));
      setValues({ ...values, date: '', grundpreis: '', arbeitspreis: '', abschlag: '' });
      setMessage('Konditionen gespeichert.');
    } catch { setError('Die Konditionen konnten nicht gespeichert werden. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.'); }
    finally { setLoading(false); }
  };
  const handleDelete = async (id: string) => {
    if (loading) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const { error } = await supabase.from('rates').delete().eq('id', id);
      if (error) throw error;
      setRates(rates.filter(rate => rate.id !== id)); setMessage('Konditionen gelöscht.');
    } catch { setError('Die Konditionen konnten nicht gelöscht werden. Bitte versuche es erneut.'); }
    finally { setLoading(false); }
  };
  const fields = [
    ['date', 'Gültig ab', 'date'], ['grundpreis', 'Grundpreis (€/Monat)', 'number'],
    ['arbeitspreis', 'Arbeitspreis (ct/kWh)', 'number'], ['abschlag', 'Abschlag (€/Monat)', 'number'],
    ...(isGas ? [['umrechnungsfaktor', 'Umrechnungsfaktor (kWh/m³)', 'number']] : []),
  ];
  return <div className="space-y-6">
    <form noValidate onSubmit={handleAdd} className="parity-form" aria-busy={loading}>
      <fieldset disabled={loading}>
        <legend className="sr-only">Neue Konditionen</legend>
        <div className="rate-fields">{fields.map(([key, label, type]) => <div className="form-field" key={key}>
          <Label htmlFor={`${prefix}-${key}`}>{label}</Label>
          <Input id={`${prefix}-${key}`} type={type} step={type === 'number' ? '0.01' : undefined} value={values[key as keyof typeof values]} onChange={event => setValues({ ...values, [key]: event.target.value })} required />
        </div>)}</div>
        <Button type="submit">{loading ? 'Bitte warten …' : 'Hinzufügen'}</Button>
      </fieldset>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="form-success" role="status">{message}</p>
    <Table><TableHeader><TableRow>
      <TableHead>Gültig ab</TableHead><TableHead className="text-right">Grundpreis (€/Monat)</TableHead><TableHead className="text-right">Arbeitspreis (ct/kWh)</TableHead><TableHead className="text-right">Abschlag (€/Monat)</TableHead>{isGas && <TableHead className="text-right">Faktor (kWh/m³)</TableHead>}<TableHead><span className="sr-only">Aktionen</span></TableHead>
    </TableRow></TableHeader><TableBody>{rates.map(rate => <TableRow key={rate.id}>
      <TableCell>{formatDate(rate.effective_from, locale)}</TableCell>
      <TableCell className="text-right">{rate.grundpreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</TableCell>
      <TableCell className="text-right">{rate.arbeitspreis.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</TableCell>
      <TableCell className="text-right">{rate.abschlag.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</TableCell>
      {isGas && <TableCell className="text-right">{rate.umrechnungsfaktor.toLocaleString('de-DE')}</TableCell>}
      <TableCell><Button variant="ghost" size="icon" disabled={loading} onClick={() => handleDelete(rate.id)} aria-label={`Konditionen vom ${formatDate(rate.effective_from, locale)} löschen`}><Trash2 className="text-destructive" /></Button></TableCell>
    </TableRow>)}</TableBody></Table>
    {!rates.length && <p className="text-sm text-muted-foreground">Noch keine Konditionen hinterlegt.</p>}
  </div>;
}
