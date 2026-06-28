import { MonthlyBreakdown } from '@/lib/calculations';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

export function ContractMonthlyTable({
  breakdown,
}: {
  breakdown: MonthlyBreakdown[];
}) {
  const totalConsumption = breakdown.reduce(
    (sum, entry) => sum + entry.consumption,
    0,
  );

  const totalCost = breakdown.reduce((sum, entry) => sum + entry.cost, 0);

  const now = new Date();
  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  };
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Monat</TableHead>
            <TableHead className="text-right">Verbrauch (kWh)</TableHead>
            <TableHead className="text-right">Kosten</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breakdown.map((e) => (
            <TableRow
              key={e.month}
              className={isCurrentMonth(e.month) ? 'text-muted-foreground' : ''}
            >
              <TableCell>
                {new Date(e.month).toLocaleDateString('de-DE', {
                  month: 'short',
                  year: '2-digit',
                })}{' '}
                {isCurrentMonth(e.month) ? '(aktuell)' : ''}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {Math.round(e.consumption)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {e.cost.toFixed(2)} €
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="text-muted-foreground font-medium">
              Gesamt
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {totalConsumption ? Math.round(totalConsumption) : 0} kWh
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {totalCost ? totalCost.toFixed(2) : 0} €
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
