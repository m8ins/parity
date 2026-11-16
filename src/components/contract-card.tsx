import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Meter, MeterData } from '@/lib/types';
import { calculateProjection } from '@/lib/calculations';
import { formatPeriodLabel, addOneYear } from '@/lib/contracts';
import { useLocale } from '@/lib/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Zap,
  Flame,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Trash,
  Pencil,
  Table as TableIcon,
  ChartSpline,
} from 'lucide-react';
import Link from 'next/link';
import { ContractChart } from './contract-chart';
import { ContractMonthlyTable } from './contract-monthly-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ReadingDialog } from './reading-dialog';
import { Reading } from '@/lib/types';
import { latestReading, formatReading, formatReadingDate } from '@/lib/readings';

interface ContractCardProps {
  meter: Meter;
  meterData: MeterData;
  onUpdate: () => void;
  onReadingAdded: (meterId: string, reading: Reading) => void;
  onDelete: (id: string) => void;
}

export function ContractCard({
  meter,
  meterData,
  onUpdate,
  onReadingAdded,
  onDelete,
}: ContractCardProps) {
  const [confirmation, setConfirmation] = useState('');
  const lastReading = latestReading(meterData.readings);
  const isGas = meter.type === 'gas';
  const Icon = isGas ? Flame : Zap;
  const locale = useLocale();

  const { contracts, ratesByContract, readings } = meterData;

  // Default to the newest period (contracts are sorted newest-first).
  const [selectedContractId, setSelectedContractId] = useState(
    contracts[0]?.id ?? '',
  );
  const selectedContract =
    contracts.find((c) => c.id === selectedContractId) ?? contracts[0] ?? null;
  const rates = selectedContract
    ? (ratesByContract[selectedContract.id] ?? [])
    : [];

  const projection = selectedContract && rates.length > 0
    ? calculateProjection(meter, selectedContract, readings, rates)
    : null;
  const currentAbschlag = rates[rates.length - 1]?.abschlag ?? null;
  const periodReadings = selectedContract ? readings.filter(reading => reading.date >= selectedContract.period_start && reading.date <= (selectedContract.period_end ?? addOneYear(selectedContract.period_start))) : [];
  const forecastHint = !selectedContract
    ? 'Für eine Prognose fehlt noch ein Abrechnungszeitraum. Deine Ablesungen bleiben gespeichert.'
    : periodReadings.length < 2
      ? `Für eine Prognose brauchen wir mindestens zwei Ablesungen im gewählten Abrechnungszeitraum. Bisher: ${periodReadings.length}.`
      : !rates.length
        ? 'Für eine Kostenprognose fehlen noch die Konditionen des gewählten Abrechnungszeitraums.'
        : 'Für eine Prognose brauchen wir Ablesungen an mindestens zwei verschiedenen Tagen im gewählten Abrechnungszeitraum.';

  const diff = projection ? projection.difference : 0;
  const isGood = diff >= 0;
  const settlement = selectedContract?.settlement_amount;
  const hasSettlement = settlement !== null && settlement !== undefined;

  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const supabase = createClient();

  const handleRename = async () => {
    if (!newName.trim()) return;
    if (renameBusy) return;
    setRenameBusy(true); setRenameError('');
    try {
      const { error } = await supabase.from('meters').update({ name: newName }).eq('id', meter.id);
      if (error) throw error;
      setIsRenaming(false); onUpdate();
    } catch { setRenameError('Der Name konnte nicht gespeichert werden. Bitte versuche es erneut.'); }
    finally { setRenameBusy(false); }
  };

  return (
    <>
      <Dialog open={isRenaming} onOpenChange={value => { if (!renameBusy) setIsRenaming(value); }}>
        <DialogContent aria-busy={renameBusy} showCloseButton={!renameBusy}>
          <DialogHeader>
            <DialogTitle>Zähler umbenennen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <label htmlFor={`name-${meter.id}`} className="parity-label">Zählername</label>
            <Input
              id={`name-${meter.id}`} disabled={renameBusy}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
          </div>
          {renameError && <p className="form-error" role="alert">{renameError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={renameBusy} onClick={() => setIsRenaming(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleRename} disabled={renameBusy}>{renameBusy ? 'Wird gespeichert …' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="flex min-w-0 flex-col border-2 border-foreground shadow-none" data-meter-id={meter.id}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex min-w-0 flex-row items-center gap-2">
            <Icon
              className={`h-4 w-4 text-foreground`}
            />
            <CardTitle className="min-w-0 font-medium break-words">
              <Link href={`/meter/${meter.id}`} className="hover:underline">
                {meter.name}
              </Link>
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${meter.name} verwalten`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setNewName(meter.name);
                  setIsRenaming(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Umbenennen
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(meter.id)}
                variant="destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex-1 min-w-0">
          <div className="meter-reading-summary">
            <p>Letzter Zählerstand</p>
            {lastReading ? <>
              <strong className="meter-reading-number numeric" tabIndex={0} aria-label={`Letzter Zählerstand ${formatReading(lastReading.value)} ${isGas ? 'm³' : 'kWh'}`}>
                {formatReading(lastReading.value)} <small>{isGas ? 'm³' : 'kWh'}</small>
              </strong>
              <p>Abgelesen am <time dateTime={lastReading.date}>{formatReadingDate(lastReading.date)}</time></p>
            </> : <p>Noch keine Ablesung vorhanden.</p>}
            <div role="status" className="meter-confirmation">{confirmation}</div>
          </div>
          {contracts.length > 1 && (
            <Select
              value={selectedContract?.id}
              onValueChange={setSelectedContractId}
            >
              <SelectTrigger size="sm" className="mb-3 w-full">
                <SelectValue placeholder="Vertragsjahr" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatPeriodLabel(c, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {projection ? <>
            <div className="text-2xl font-bold numeric">
              {projection.projectedYearlyCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              <span className="text-sm font-normal text-muted-foreground ml-2">geschätzt / Jahr</span>
            </div>
          </> : <div className="forecast-empty">
            <p><strong>Noch keine Prognose</strong></p>
            <p>{forecastHint}</p>
          </div>}
          <p className="text-sm text-muted-foreground mt-3 numeric">
            {currentAbschlag === null ? 'Abschlag noch nicht hinterlegt.' : `Aktueller Abschlag: ${(currentAbschlag * 12).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / Jahr`}
            {contracts.length <= 1 && selectedContract?.provider ? ` · ${selectedContract.provider}` : ''}
          </p>

          {/* Final settlement recorded → show actual vs. forecast. */}
          {hasSettlement ? (
            <div
              className={`mt-4 rounded-md p-2 text-sm ${settlement! >= 0 ? 'status-positive' : 'status-negative'}`}
            >
              <div className="flex items-center gap-2">
                {settlement! >= 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span>
                  Schlussabrechnung:{' '}
                  <strong>
                    {settlement! >= 0 ? 'Erstattung' : 'Nachzahlung'}{' '}
                    {Math.abs(settlement!).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </strong>
                </span>
              </div>
              {projection && (
                <div className="mt-1 text-xs opacity-80">
                  Prognose war: {projection.difference >= 0 ? '+' : '−'}
                  {Math.abs(projection.difference).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
              )}
            </div>
          ) : (
            projection && (
              <div
                className={`mt-4 rounded-md p-2 flex items-center gap-2 text-sm ${isGood ? 'status-positive' : 'status-negative'}`}
              >
                {isGood ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <div>
                  {isGood ? (
                    <span>
                      Erstattung (Prognose):{' '}
                      <strong>{diff.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                    </span>
                  ) : (
                    <span>
                      Nachzahlung (Prognose):{' '}
                      <strong>{Math.abs(diff).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                    </span>
                  )}
                </div>
              </div>
            )
          )}

          {projection && (
            <div className="mt-2 text-xs text-muted-foreground flex justify-between">
              <span>
                Abschlag deckt: {Math.round(projection.paidUsage)} kWh
              </span>
            </div>
          )}

          {projection && projection.chartData && (
            <Tabs defaultValue="chart" className="w-full mt-4">
              <TabsList className="self-end">
                <TabsTrigger value="chart" aria-label="Verbrauchsdiagramm">
                  <ChartSpline className="mx-1 h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="table" aria-label="Monatstabelle">
                  <TableIcon className="mx-1 h-4 w-4" />
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chart">
                <ContractChart
                  data={projection.chartData}
                  unit="kWh"
                  goal={projection.paidUsage}
                  isGood={isGood}
                  className="mt-4"
                />
              </TabsContent>
              <TabsContent value="table">
                <ContractMonthlyTable
                  breakdown={projection.monthlyBreakdown}
                ></ContractMonthlyTable>
              </TabsContent>
            </Tabs>
          )}

          <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
            <span>{readings.length} {readings.length === 1 ? 'Ablesung' : 'Ablesungen'}</span>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <ReadingDialog
            meterId={meter.id}
            meterName={meter.name}
            meterType={meter.type}
            lastReading={lastReading}
            onSuccess={(reading) => {
              onReadingAdded(meter.id, reading);
              setConfirmation(`Gespeichert: ${formatReading(reading.value)} ${isGas ? 'm³' : 'kWh'} am ${formatReadingDate(reading.date)}.`);
            }}
          >
            <Button className="parity-button flex-1">
              <Plus className="mr-2 h-4 w-4" /> Stand erfassen
            </Button>
          </ReadingDialog>
        </CardFooter>
      </Card>
    </>
  );
}
