'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/date-utils';
import { Meter, Reading, MeterData } from '@/lib/types';
import {
  rolloverContract,
  formatPeriodLabel,
  addOneYear,
} from '@/lib/contracts';
import { useLocale } from '@/lib/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Zap,
  Flame,
  Gauge,
  Building2,
  CalendarPlus,
  Pencil,
  Check,
  X,
  Plus,
  HandCoins,
} from 'lucide-react';
import { RateHistory } from '@/components/history-lists';
import { ReadingDialog } from '@/components/reading-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ContractDetail({
  initialMeter,
  initialData,
}: {
  initialMeter: Meter | null;
  initialData: MeterData;
}) {
  const router = useRouter();
  const supabase = createClient();
  const locale = useLocale();

  const [meter, setMeter] = useState<Meter | null>(initialMeter);
  const { contracts, ratesByContract } = initialData;
  const [readings, setReadings] = useState<Reading[]>(
    [...initialData.readings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
  );

  // Newest period first; default the view to it.
  const [selectedContractId, setSelectedContractId] = useState(
    contracts[0]?.id ?? '',
  );
  const contract =
    contracts.find((c) => c.id === selectedContractId) ?? contracts[0] ?? null;
  const rates = contract ? (ratesByContract[contract.id] ?? []) : [];

  const newest = contracts[0] ?? null;
  const newestRates = newest ? (ratesByContract[newest.id] ?? []) : [];
  const newestLatestRate = newestRates[newestRates.length - 1] ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  // Rollover dialog state
  const [rolloverOpen, setRolloverOpen] = useState(false);
  const [roStart, setRoStart] = useState('');
  const [roEnd, setRoEnd] = useState('');
  const [roProvider, setRoProvider] = useState('');
  const [roAbschlag, setRoAbschlag] = useState('');
  const [roBusy, setRoBusy] = useState(false);
  const [roError, setRoError] = useState('');

  // Settlement dialog state
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleSign, setSettleSign] = useState<'erstattung' | 'nachzahlung'>(
    'erstattung',
  );
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState('');
  const [settleBusy, setSettleBusy] = useState(false);

  const handleRename = async () => {
    if (!meter || !newName.trim()) return;
    const { error } = await supabase
      .from('meters')
      .update({ name: newName })
      .eq('id', meter.id);
    if (!error) {
      setMeter({ ...meter, name: newName });
      setIsRenaming(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!contract) return;
    const { error } = await supabase
      .from('contracts')
      .update({
        period_start: editPeriodStart || contract.period_start,
        period_end: editPeriodEnd || null,
        provider: editProvider.trim() || null,
      })
      .eq('id', contract.id);
    if (!error) {
      setIsEditing(false);
      router.refresh();
    }
  };

  const handleDeleteReading = async (rid: string) => {
    const { error } = await supabase.from('readings').delete().eq('id', rid);
    if (!error) setReadings(readings.filter((r) => r.id !== rid));
  };

  const handleReadingAdded = (reading: Reading) => {
    setReadings((prev) => {
      const next = [reading, ...prev];
      next.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return next;
    });
    router.refresh();
  };

  const openRollover = () => {
    if (!newest) return;
    const start = newest.period_end ?? addOneYear(newest.period_start);
    setRoStart(start);
    setRoEnd(addOneYear(start));
    setRoProvider(newest.provider ?? '');
    setRoAbschlag(newestLatestRate ? String(newestLatestRate.abschlag) : '');
    setRoError('');
    setRolloverOpen(true);
  };

  // Keep the end one year after the start as the start is changed, unless the
  // user has deliberately moved the end.
  const handleRoStartChange = (value: string) => {
    setRoStart(value);
    if (roEnd === addOneYear(roStart) || !roEnd) {
      setRoEnd(value ? addOneYear(value) : '');
    }
  };

  const handleRollover = async () => {
    if (!newest) return;
    setRoBusy(true);
    setRoError('');
    try {
      await rolloverContract(supabase, newest, newestLatestRate, {
        period_start: roStart,
        period_end: roEnd,
        provider: roProvider.trim() || undefined,
        abschlag: roAbschlag ? Number(roAbschlag) : undefined,
      });
      setRolloverOpen(false);
      router.refresh();
    } catch (e) {
      console.error('Rollover failed:', e);
      setRoError(e instanceof Error ? e.message : 'Anlegen fehlgeschlagen.');
    } finally {
      setRoBusy(false);
    }
  };

  const openSettlement = () => {
    if (!contract) return;
    const existing = contract.settlement_amount;
    if (existing !== null && existing !== undefined) {
      setSettleSign(existing >= 0 ? 'erstattung' : 'nachzahlung');
      setSettleAmount(String(Math.abs(existing)));
    } else {
      setSettleSign('erstattung');
      setSettleAmount('');
    }
    setSettleDate(contract.settlement_date ?? '');
    setSettleOpen(true);
  };

  const handleSaveSettlement = async () => {
    if (!contract || !settleAmount) return;
    setSettleBusy(true);
    const signed =
      (settleSign === 'nachzahlung' ? -1 : 1) * Math.abs(Number(settleAmount));
    const { error } = await supabase
      .from('contracts')
      .update({
        settlement_amount: signed,
        settlement_date: settleDate || null,
      })
      .eq('id', contract.id);
    setSettleBusy(false);
    if (!error) {
      setSettleOpen(false);
      router.refresh();
    }
  };

  if (!meter) return <div className="p-8">Zähler nicht gefunden</div>;

  const settlement = contract?.settlement_amount;
  const hasSettlement = settlement !== null && settlement !== undefined;

  return (
    <div className="container mx-auto max-w-xl p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-9 text-2xl font-bold w-64"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-green-500 hover:text-green-600"
              onClick={handleRename}
            >
              <Check className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-gray-500 hover:text-gray-600"
              onClick={() => setIsRenaming(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <h1
            className="text-3xl font-bold cursor-pointer hover:outline  hover:outline-muted-foreground/20 hover:rounded-sm px-1 -mx-1 select-none"
            onClick={() => {
              setNewName(meter.name);
              setIsRenaming(true);
            }}
            title="Klicken zum Umbenennen"
          >
            {meter.name}
          </h1>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {contracts.length > 1 ? (
          <Select value={contract?.id} onValueChange={setSelectedContractId}>
            <SelectTrigger size="sm" className="w-56">
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
        ) : (
          <span className="text-sm text-muted-foreground">
            {contract ? formatPeriodLabel(contract, locale) : 'Keine Periode'}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={openRollover}
          disabled={!newest}
        >
          <CalendarPlus className="mr-2 h-4 w-4" /> Neue Periode / Wechsel
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="rates">Tarife</TabsTrigger>
          <TabsTrigger value="readings">Ablesungen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader className="flex flex-row items-top justify-between space-y-0">
              <CardTitle>Details</CardTitle>
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditPeriodStart(contract?.period_start || '');
                    setEditPeriodEnd(contract?.period_end || '');
                    setEditProvider(contract?.provider || '');
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-green-500 hover:text-green-600"
                    onClick={handleSaveDetails}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <dl className="space-y-0.5">
                <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                  <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                    {meter.type === 'gas' ? (
                      <Flame className="h-4 w-4" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}{' '}
                    Typ
                  </dt>
                  <dd className="text-sm font-medium capitalize">
                    {meter.type === 'gas' ? 'Gas' : 'Strom'}
                  </dd>
                </div>
                <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                  <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                    <Building2 className="h-4 w-4" /> Anbieter
                  </dt>
                  <dd className="text-sm font-medium flex-1">
                    {isEditing ? (
                      <Input
                        value={editProvider}
                        onChange={(e) => setEditProvider(e.target.value)}
                        placeholder="z. B. Vattenfall"
                        className="h-8"
                      />
                    ) : (
                      contract?.provider || (
                        <span className="text-muted-foreground">—</span>
                      )
                    )}
                  </dd>
                </div>
                {contract && (
                  <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                    <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                      <Calendar className="h-4 w-4" /> Periode Start
                    </dt>
                    <dd className="text-sm font-medium flex-1">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editPeriodStart}
                          onChange={(e) => setEditPeriodStart(e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        formatDate(contract.period_start, locale)
                      )}
                    </dd>
                  </div>
                )}
                {(isEditing || contract?.period_end) && (
                  <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                    <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                      <Calendar className="h-4 w-4" /> Periode Ende
                    </dt>
                    <dd className="text-sm font-medium flex-1">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editPeriodEnd}
                          onChange={(e) => setEditPeriodEnd(e.target.value)}
                          className="h-8"
                        />
                      ) : contract?.period_end ? (
                        formatDate(contract.period_end, locale)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                )}
                <div className="flex flex-row items-center justify-between gap-2 py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors min-h-11">
                  <dt className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                    <HandCoins className="h-4 w-4 shrink-0" /> Schlussabrechnung
                  </dt>
                  <dd className="text-sm font-medium flex items-center gap-2">
                    {hasSettlement ? (
                      <span
                        className={
                          settlement! >= 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {settlement! >= 0 ? 'Erstattung' : 'Nachzahlung'}{' '}
                        {Math.abs(settlement!).toFixed(2)} €
                        {contract?.settlement_date
                          ? ` (${formatDate(contract.settlement_date, locale)})`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        noch nicht erfasst
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openSettlement}
                      disabled={!contract}
                    >
                      {hasSettlement ? 'Ändern' : 'Erfassen'}
                    </Button>
                  </dd>
                </div>
                {meter.type === 'gas' && rates.length > 0 && (
                  <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                    <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                      <Gauge className="h-4 w-4" /> Umrechnungsfaktor
                    </dt>
                    <dd className="text-sm font-medium flex items-center gap-2">
                      {rates[rates.length - 1].umrechnungsfaktor} kWh/m³
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Tarife</CardTitle>
            </CardHeader>
            <CardContent>
              {contract ? (
                <RateHistory
                  contractId={contract.id}
                  initialData={rates}
                  isGas={meter.type === 'gas'}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Kein aktiver Vertrag vorhanden.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readings">
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle>Ablesungen</CardTitle>
                <ReadingDialog
                  meterId={meter.id}
                  lastReadingValue={readings[0]?.value}
                  onSuccess={handleReadingAdded}
                >
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Ablesung hinzufügen
                  </Button>
                </ReadingDialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Wert</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readings.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDate(r.date, locale)}</TableCell>
                        <TableCell>{r.value}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReading(r.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rollover dialog */}
      <Dialog open={rolloverOpen} onOpenChange={setRolloverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Periode / Anbieterwechsel</DialogTitle>
            <DialogDescription>
              Für den regulären Jahreswechsel oder einen unterjährigen
              Anbieterwechsel. Der letzte Tarif/Abschlag wird übernommen (unten
              anpassbar), das Guthaben startet bei 0.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="ro-start">Wechsel-/Startdatum</Label>
              <Input
                id="ro-start"
                type="date"
                value={roStart}
                onChange={(e) => handleRoStartChange(e.target.value)}
              />
              {newest && (
                <p className="text-xs text-muted-foreground">
                  Die laufende Periode (ab {formatDate(newest.period_start, locale)})
                  endet zum {roStart ? formatDate(roStart, locale) : '…'}.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ro-end">Ende der neuen Periode</Label>
              <Input
                id="ro-end"
                type="date"
                value={roEnd}
                onChange={(e) => setRoEnd(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ro-provider">Anbieter</Label>
              <Input
                id="ro-provider"
                value={roProvider}
                onChange={(e) => setRoProvider(e.target.value)}
                placeholder="z. B. Vattenfall"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ro-abschlag">Abschlag (€ / Monat)</Label>
              <Input
                id="ro-abschlag"
                type="number"
                step="0.01"
                value={roAbschlag}
                onChange={(e) => setRoAbschlag(e.target.value)}
              />
            </div>
          </div>
          {roError && (
            <p className="text-sm text-red-600" role="alert">
              {roError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolloverOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleRollover} disabled={roBusy || !roStart}>
              {roBusy ? 'Wird angelegt…' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schlussabrechnung erfassen</DialogTitle>
            <DialogDescription>
              Der tatsächliche Betrag aus der Abrechnung des Versorgers für
              diese Periode.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Art</Label>
              <Select
                value={settleSign}
                onValueChange={(v) =>
                  setSettleSign(v as 'erstattung' | 'nachzahlung')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="erstattung">Erstattung</SelectItem>
                  <SelectItem value="nachzahlung">Nachzahlung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settle-amount">Betrag (€)</Label>
              <Input
                id="settle-amount"
                type="number"
                step="0.01"
                min="0"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settle-date">Datum</Label>
              <Input
                id="settle-date"
                type="date"
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveSettlement}
              disabled={settleBusy || !settleAmount}
            >
              {settleBusy ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
