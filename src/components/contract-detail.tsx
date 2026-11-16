'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { periodEnd } from '@/lib/calculations';
import { formatDate } from '@/lib/date-utils';
import { Meter, Reading, MeterData } from '@/lib/types';
import {
  rolloverContract,
  formatPeriodLabel,
  addOneYear,
} from '@/lib/contracts';
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
  Flame,
  Zap,
  Trash2,
  Calendar,
  Gauge,
  Building2,
  CalendarPlus,
  Pencil,
  Check,
  X,
  Plus,
  HandCoins,
} from 'lucide-react';
import { PeriodUnderstanding } from './PeriodUnderstanding';
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
  initialContractId,
  asOf,
}: {
  initialMeter: Meter | null;
  initialData: MeterData;
  initialContractId?: string;
  asOf?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const locale = 'de-DE';

  const [meter, setMeter] = useState<Meter | null>(initialMeter);
  const { contracts, ratesByContract } = initialData;
  const [readings, setReadings] = useState<Reading[]>(
    [...initialData.readings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
  );

  // Newest period first; default the view to it.
  const [selectedContractId, setSelectedContractId] = useState(
    initialContractId ?? contracts[0]?.id ?? '',
  );
  const contract =
    contracts.find((c) => c.id === selectedContractId) ?? contracts[0] ?? null;
  const rates = contract ? (ratesByContract[contract.id] ?? []) : [];

  const newest = contracts[0] ?? null;
  const newestRates = newest ? (ratesByContract[newest.id] ?? []) : [];
  const newestLatestRate = newestRates[newestRates.length - 1] ?? null;

  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [settleError, setSettleError] = useState('');
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

  const runAction = async (action: () => Promise<void>) => {
    if (actionBusy) return;
    setActionBusy(true); setActionError('');
    try { await action(); }
    catch { setActionError('Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.'); }
    finally { setActionBusy(false); }
  };
  const handleRename = () => runAction(async () => {
    if (!meter || !newName.trim()) return;
    const { error } = await supabase.from('meters').update({ name: newName }).eq('id', meter.id);
    if (error) throw error;
    setMeter({ ...meter, name: newName }); setIsRenaming(false);
  });
  const handleSaveDetails = () => runAction(async () => {
    if (!contract) return;
    const { error } = await supabase.from('contracts').update({
      period_start: editPeriodStart || contract.period_start,
      period_end: editPeriodEnd || null, provider: editProvider.trim() || null,
    }).eq('id', contract.id);
    if (error) throw error;
    setIsEditing(false); router.refresh();
  });
  const handleDeleteReading = (rid: string) => runAction(async () => {
    const { error } = await supabase.from('readings').delete().eq('id', rid);
    if (error) throw error;
    setReadings(readings.filter(reading => reading.id !== rid));
  });

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
      setRoError('Der neue Zeitraum konnte nicht angelegt werden. Prüfe die Angaben und versuche es erneut.');
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
    setSettleError('');
    try {
      const { error } = await supabase.from('contracts').update({ settlement_amount: signed, settlement_date: settleDate || null }).eq('id', contract.id);
      if (error) throw error;
      setSettleOpen(false); router.refresh();
    } catch { setSettleError('Die Schlussabrechnung konnte nicht gespeichert werden. Bitte versuche es erneut.'); }
    finally { setSettleBusy(false); }
  };

  if (!meter) return <div className="p-8">Zähler nicht gefunden</div>;

  const settlement = contract?.settlement_amount;
  const hasSettlement = settlement !== null && settlement !== undefined;
  const periodLabel = contract ? `(${contract.period_start.split('-').reverse().join('.')} – ${new Date(Date.parse(periodEnd(contract)) - 86400000).toISOString().slice(0, 10).split('-').reverse().join('.')}${!contract.period_end ? ', Ende vorläufig' : ''})` : 'Kein Abrechnungszeitraum';

  return (
    <div className="parity-page detail-page space-y-6">
      <header className="detail-heading">
        <Button aria-label="Zurück zur Übersicht" variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <div className="detail-title-group">
        {isRenaming ? (
          <div className="rename-field">
            <Input aria-label="Zählername" disabled={actionBusy}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-2xl font-bold"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-foreground"
              onClick={handleRename} disabled={actionBusy} aria-label="Zählername speichern"
            >
              <Check className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => setIsRenaming(false)} disabled={actionBusy} aria-label="Umbenennen abbrechen"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <h1><button type="button" className="text-left cursor-pointer" onClick={() => { setNewName(meter.name); setIsRenaming(true); }} aria-label={`${meter.name} umbenennen`}>{meter.type === 'gas' ? <Flame className="detail-type-icon" aria-label="Gas" /> : <Zap className="detail-type-icon" aria-label="Strom" />}{meter.name}</button></h1>
        )}
        {contracts.length > 1 ? (
          <Select value={contract?.id} onValueChange={setSelectedContractId}>
            <SelectTrigger size="sm" className="detail-period-select" aria-label="Abrechnungszeitraum">
              <SelectValue placeholder="Abrechnungszeitraum">{periodLabel}</SelectValue>
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
            {periodLabel}
          </span>
        )}

        </div>
      </header>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Verstehen</TabsTrigger>
          <TabsTrigger value="manage">Verwalten</TabsTrigger>
          <TabsTrigger value="rates">Konditionen</TabsTrigger>
          <TabsTrigger value="readings">Ablesungen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PeriodUnderstanding meter={meter} contract={contract} readings={readings} rates={rates} asOf={asOf} />
        </TabsContent>
        <TabsContent value="manage">
        <Button
          variant="outline"
          size="sm"
          onClick={openRollover}
          disabled={!newest}
        >
          <CalendarPlus className="mr-2 h-4 w-4" /> Neuer Zeitraum / Wechsel
        </Button>
          <Card>
            <CardHeader className="flex flex-row items-top justify-between space-y-0">
              <CardTitle>Details</CardTitle>
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Details bearbeiten" disabled={!contract || actionBusy}
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
                    className="text-destructive"
                    onClick={() => setIsEditing(false)} disabled={actionBusy} aria-label="Details bearbeiten abbrechen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-foreground"
                    onClick={handleSaveDetails} disabled={actionBusy} aria-label="Details speichern"
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
                    <Building2 className="h-4 w-4" /> Anbieter
                  </dt>
                  <dd className="text-sm font-medium flex-1">
                    {isEditing ? (
                      <Input
                        aria-label="Anbieter" disabled={actionBusy} value={editProvider}
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
                      <Calendar className="h-4 w-4" /> Beginn
                    </dt>
                    <dd className="text-sm font-medium flex-1">
                      {isEditing ? (
                        <Input
                          type="date"
                          aria-label="Beginn" disabled={actionBusy} value={editPeriodStart}
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
                      <Calendar className="h-4 w-4" /> Ende
                    </dt>
                    <dd className="text-sm font-medium flex-1">
                      {isEditing ? (
                        <Input
                          type="date"
                          aria-label="Ende" disabled={actionBusy} value={editPeriodEnd}
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
                          settlement! >= 0 ? 'text-foreground' : 'text-destructive'
                        }
                      >
                        {settlement! >= 0 ? 'Erstattung' : 'Nachzahlung'}{' '}
                        {Math.abs(settlement!).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
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
                      {rates[rates.length - 1].umrechnungsfaktor.toLocaleString('de-DE', { maximumFractionDigits: 20 })} kWh/m³ (letzte Konditionen)
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
              <CardTitle>Konditionen</CardTitle>
            </CardHeader>
            <CardContent>
              {contract ? (
                <RateHistory key={contract?.id}
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
                <CardTitle>Alle Ablesungen dieses Zählers</CardTitle>
                <ReadingDialog
                  meterId={meter.id}
              meterName={meter.name}
              meterType={meter.type}
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
                      <TableHead className="text-right">Zählerstand ({meter.type === 'gas' ? 'm³' : 'kWh'})</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readings.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDate(r.date, locale)}</TableCell>
                        <TableCell className="text-right">{r.value.toLocaleString('de-DE', { maximumFractionDigits: 20 })}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReading(r.id)} disabled={actionBusy} aria-label={`Ablesung vom ${formatDate(r.date, locale)} löschen`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
      <Dialog open={rolloverOpen} onOpenChange={value => { if (!roBusy) setRolloverOpen(value); }}>
        <DialogContent aria-busy={roBusy} showCloseButton={!roBusy}>
          <DialogHeader>
            <DialogTitle>Neuer Zeitraum / Anbieterwechsel</DialogTitle>
            <DialogDescription>
              Für den regulären Jahreswechsel oder einen unterjährigen
              Anbieterwechsel. Der letzte Tarif/Abschlag wird übernommen (unten
              anpassbar), das Guthaben startet bei 0.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-4 py-2" disabled={roBusy}>
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
                  Der laufende Zeitraum (ab {formatDate(newest.period_start, locale)})
                  endet zum {roStart ? formatDate(roStart, locale) : '…'}.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ro-end">Ende des neuen Zeitraums</Label>
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
          </fieldset>
          {roError && (
            <p className="text-sm text-destructive" role="alert">
              {roError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={roBusy} onClick={() => setRolloverOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleRollover} disabled={roBusy || !roStart}>
              {roBusy ? 'Wird angelegt…' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement dialog */}
      <Dialog open={settleOpen} onOpenChange={value => { if (!settleBusy) setSettleOpen(value); }}>
        <DialogContent aria-busy={settleBusy} showCloseButton={!settleBusy}>
          <DialogHeader>
            <DialogTitle>Schlussabrechnung erfassen</DialogTitle>
            <DialogDescription>
              Der tatsächliche Betrag aus der Abrechnung des Versorgers für
              diesen Abrechnungszeitraum.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-4 py-2" disabled={settleBusy}>
            <div className="grid gap-2">
              <Label htmlFor="settle-sign">Art</Label>
              <Select
                value={settleSign}
                onValueChange={(v) =>
                  setSettleSign(v as 'erstattung' | 'nachzahlung')
                }
              >
                <SelectTrigger id="settle-sign" disabled={settleBusy}>
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
          </fieldset>
          {settleError && <p className="form-error" role="alert">{settleError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={settleBusy} onClick={() => setSettleOpen(false)}>
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
