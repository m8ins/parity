'use client';

import { MonthlyBreakdown } from '@/lib/calculations';
import { formatDate } from '@/lib/date-utils';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table';

const money = (value: number) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const quantity = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
export function ContractMonthlyTable({ breakdown }: { breakdown: MonthlyBreakdown[] }) {
  if (!breakdown.length) return <p>Keine durch Ablesungen abgedeckten Monatswerte vorhanden.</p>;
  const totalConsumption = breakdown.reduce((sum, entry) => sum + entry.consumption, 0);
  const totalCost = breakdown.every(e => e.cost !== null) ? breakdown.reduce((sum, e) => sum + e.cost!, 0) : null;
  return <div className="border rounded-md">
    <Table>
      <caption className="sr-only">Aus Ablesungen abgeleitete Monatswerte, Kosten geschätzt; Bis-Datum exklusiv</caption>
      <TableHeader><TableRow>
        <TableHead>Von / bis (exklusiv)</TableHead>
        <TableHead className="text-right">Verbrauch (kWh)</TableHead>
        <TableHead className="text-right">Kosten (geschätzt)</TableHead>
      </TableRow></TableHeader>
      <TableBody>{breakdown.map(e => <TableRow key={e.month}>
        <TableCell>{formatDate(e.month.slice(0, 10), 'de-DE')}{e.end ? ` – ${formatDate(e.end, 'de-DE')}` : ''}</TableCell>
        <TableCell className="text-right numeric">{quantity(e.consumption)}</TableCell>
        <TableCell className="text-right numeric">{e.cost === null ? 'Nicht berechenbar' : money(e.cost)}</TableCell>
      </TableRow>)}</TableBody>
      <TableFooter><TableRow>
        <TableCell>Abgedeckter Teilzeitraum</TableCell>
        <TableCell className="text-right numeric">{quantity(totalConsumption)} kWh</TableCell>
        <TableCell className="text-right numeric">{totalCost === null ? 'Nicht berechenbar' : money(totalCost)}</TableCell>
      </TableRow></TableFooter>
    </Table>
  </div>;
}
