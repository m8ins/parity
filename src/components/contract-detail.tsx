'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { inclusiveEnd } from '@/lib/billing-period';
import { PeriodEndDialog } from './PeriodEndDialog';
import { BillingSettlement } from './BillingSettlement';
import { BillingContinuation } from './BillingContinuation';
import { formatDate } from '@/lib/date-utils';
import { Meter, Reading, MeterData } from '@/lib/types';
import {
  formatPeriodLabel,
} from '@/lib/contracts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RenameMeterDialog } from './RenameMeterDialog';
import { RouteState } from './RouteState';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
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
  useEffect(() => setMeter(initialMeter), [initialMeter]);
  const renameButton = useRef<HTMLButtonElement>(null);
  const [contracts, setContracts] = useState(initialData.contracts);
  useEffect(() => setContracts(initialData.contracts), [initialData.contracts]);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const endButton = useRef<HTMLButtonElement>(null);
  const [ratesByContract, setRatesByContract] = useState(initialData.ratesByContract);
  useEffect(() => setRatesByContract(initialData.ratesByContract), [initialData.ratesByContract]);
  const [activeTab, setActiveTab] = useState('overview');
  const overviewTab = useRef<HTMLButtonElement>(null);
  const [readings, setReadings] = useState<Reading[]>(
    [...initialData.readings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
  );

  useEffect(() => setReadings([...initialData.readings].sort((a, b) => b.date.localeCompare(a.date))), [initialData.readings]);

  // Newest period first; default the view to it.
  const [selectedContractId, setSelectedContractId] = useState(
    initialContractId ?? contracts[0]?.id ?? '',
  );
  useEffect(() => setSelectedContractId(initialContractId ?? initialData.contracts[0]?.id ?? ''), [initialContractId, initialData.contracts]);
  const contract = contracts.find((c) => c.id === selectedContractId) ?? null;
  const rates = contract ? (ratesByContract[contract.id] ?? []) : [];

  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const runAction = async (action: () => Promise<void>) => {
    if (actionBusy) return;
    setActionBusy(true); setActionError('');
    try { await action(); }
    catch { setActionError('Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.'); }
    finally { setActionBusy(false); }
  };
  const handleSaveDetails = () => runAction(async () => {
    if (!contract) return;
    const { data, error } = await supabase.rpc('save_billing_period_details', {
      p_period_id: contract.id,
      p_expected: { period_start: contract.period_start, period_end: contract.period_end ?? null, provider: contract.provider ?? null },
      p_start: editPeriodStart || contract.period_start,
      p_provider: editProvider.trim() || null,
    });
    if (error || !data) throw error ?? new Error('Missing confirmed period');
    setContracts(previous => previous.map(period => period.id === contract.id ? data : period));
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

  if (!meter) return <RouteState />;
  if (selectedContractId && !contract) return <RouteState title="Zeitraum nicht verfügbar" href={`/meter/${meter.id}`} label="Zum aktuellen Zeitraum">Dieser Zeitraum wurde entfernt oder ist für diesen Zähler nicht zugänglich.</RouteState>;

  const settlement = contract?.settlement_amount;
  const hasSettlement = settlement !== null && settlement !== undefined;
  const periodLabel = contract ? contract.period_end ? `(${contract.period_start.split('-').reverse().join('.')} – ${inclusiveEnd(contract).split('-').reverse().join('.')})` : `(ab ${contract.period_start.split('-').reverse().join('.')} · offen)` : 'Kein Abrechnungszeitraum';

  return (
    <div className="parity-page detail-page space-y-6">
      <header className="detail-heading">
        <Button aria-label="Zurück zur Übersicht" variant="ghost" size="icon-sm" asChild><Link href="/"><ArrowLeft /></Link></Button>
        <div className="detail-title-group">
        <div className="detail-name">
          <h1>{meter.type === 'gas' ? <Flame className="detail-type-icon" aria-label="Gas" /> : <Zap className="detail-type-icon" aria-label="Strom" />}{meter.name}</h1>
          <Button ref={renameButton} variant="ghost" size="icon" onClick={() => setIsRenaming(true)} aria-label={`${meter.name} umbenennen`}><Pencil aria-hidden="true" /></Button>
        </div>
        {isRenaming && <RenameMeterDialog meter={meter} open onOpenChange={setIsRenaming} onSaved={saved => { setMeter(saved); router.refresh(); }} returnFocus={() => renameButton.current?.focus()} />}
        {contracts.length > 1 ? (
          <Select value={contract?.id} onValueChange={id => { setSelectedContractId(id); setIsEditing(false); router.push(`/meter/${meter.id}?period=${id}`, { scroll: false }); }}>
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

        {contract && <Button ref={endButton} variant="ghost" size="sm" className="period-end-action" onClick={() => setEndDialogOpen(true)}>{contract.period_end ? 'Ende ändern' : 'Ende festlegen'}</Button>}
        </div>
      </header>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger ref={overviewTab} value="overview">Verstehen</TabsTrigger>
          <TabsTrigger value="manage">Verwalten</TabsTrigger>
          <TabsTrigger value="rates">Konditionen</TabsTrigger>
          <TabsTrigger value="readings">Ablesungen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PeriodUnderstanding meter={meter} contract={contract} readings={readings} rates={rates} asOf={asOf} />
        </TabsContent>
        <TabsContent value="manage">
        {contract && <BillingContinuation meter={meter} period={contract} contracts={contracts} rates={rates}
          onSelect={id => { setSelectedContractId(id); setActiveTab('overview'); router.replace(`/meter/${meter.id}?period=${id}`, { scroll: false }); requestAnimationFrame(() => overviewTab.current?.focus()); }}
          onReload={data => { setContracts(data.contracts); setRatesByContract(data.ratesByContract); }}
          onSaved={result => {
            setContracts(previous => [result.contract, ...previous.filter(item => item.id !== result.contract.id).map(item => item.id === result.previous.id ? result.previous : item)]);
            setRatesByContract(previous => ({ ...previous, [result.contract.id]: result.rates }));
            router.refresh();
          }} />}
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
                <div className="flex flex-row items-center gap-2 py-2">
                  <dt className="w-36 text-sm text-muted-foreground">Bis einschließlich</dt>
                  <dd className="text-sm">{contract?.period_end ? formatDate(inclusiveEnd(contract), locale) : 'Offen'}</dd>
                </div>
                <div className="flex flex-row items-center justify-between gap-2 py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors min-h-11">
                  <dt className="text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                    <HandCoins className="h-4 w-4 shrink-0" /> Schlussabrechnung
                  </dt>
                  <dd className="text-sm font-medium flex items-center gap-2">
                    {hasSettlement ? (
                      <span
                        className={
                          settlement === 0 ? 'text-foreground' : settlement! > 0 ? 'billing-refund' : 'billing-due'
                        }
                      >
                        {settlement === 0 ? 'Ausgeglichen' : settlement! > 0 ? 'Erstattung' : 'Nachzahlung'}{' '}
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
                    {contract && <BillingSettlement key={contract.id} meter={meter} period={contract}
                      onEnd={() => setEndDialogOpen(true)}
                      onSaved={updated => { setContracts(previous => previous.map(item => item.id === updated.id ? updated : item)); router.refresh(); }} />}
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
              {contract ? (
                <RateHistory key={contract?.id}
                  contract={contract}
                  initialData={rates}
                  isGas={meter.type === 'gas'}
                  userId={meter.user_id}
                  asOf={asOf}
                  onChange={next => setRatesByContract(previous => ({ ...previous, [contract.id]: next }))}
                  onUnderstand={() => {
                    setActiveTab('overview');
                    requestAnimationFrame(() => overviewTab.current?.focus());
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Kein Abrechnungszeitraum vorhanden.
                </p>
              )}
        </TabsContent>

        <TabsContent value="readings">
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle>Alle Ablesungen dieses Zählers</CardTitle>
                <ReadingDialog
                  meterId={meter.id} userId={meter.user_id}
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

      {contract && <PeriodEndDialog period={contract} open={endDialogOpen} onClose={() => setEndDialogOpen(false)} returnFocus={() => endButton.current?.focus()} onSaved={updated => setContracts(previous => previous.map(item => item.id === updated.id ? updated : item))} />}

    </div>
  );
}
