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
import { InlineMeterName } from './InlineMeterName';
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
  const [actionErrorTarget, setActionErrorTarget] = useState<'details' | 'readings'>('details');
  const actionInFlight = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const runAction = async (target: 'details' | 'readings', action: () => Promise<void>) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActionBusy(true); setActionError(''); setActionErrorTarget(target);
    try { await action(); }
    catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
      setActionError(code === 'PGRST202'
        ? 'Die Speicherung ist derzeit nicht verfügbar. Deine Eingaben bleiben erhalten. Bitte versuche es später erneut.'
        : code === '40001' ? 'Der Zeitraum wurde inzwischen geändert. Deine Eingaben bleiben erhalten. Lade den aktuellen Stand in einem weiteren Tab und prüfe deine Änderungen.'
          : 'Die Änderung konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.');
    }
    finally { actionInFlight.current = false; setActionBusy(false); }
  };
  const handleSaveDetails = () => runAction('details', async () => {
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
  const handleDeleteReading = (rid: string) => runAction('readings', async () => {
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
  const periodLabel = contract ? formatPeriodLabel({ ...contract, provider: undefined }, locale) : 'Kein Abrechnungszeitraum';

  return (
    <div className="parity-page detail-page space-y-6">
      <header className="detail-heading">
        <Button aria-label="Zurück zur Übersicht" variant="ghost" size="icon-sm" asChild><Link href="/"><ArrowLeft /></Link></Button>
        <div className="detail-title-group">
        <InlineMeterName triggerRef={renameButton} meter={meter} editing={isRenaming} onEditingChange={setIsRenaming} onSaved={saved => { setMeter(saved); router.refresh(); }} />
        {activeTab !== 'readings' && (contracts.length > 1 ? (
          <Select value={contract?.id} onValueChange={id => { setSelectedContractId(id); setIsEditing(false); router.push(`/meter/${meter.id}?period=${id}`, { scroll: false }); }}>
            <SelectTrigger size="sm" className="detail-period-select" aria-label="Abrechnungszeitraum">
              <SelectValue placeholder="Abrechnungszeitraum">{periodLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {formatDate(c.period_start, locale)} – {c.period_end ? formatDate(inclusiveEnd(c), locale) : 'offen'}{c.provider ? ` · ${c.provider}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="detail-period-label text-sm text-muted-foreground">
            {periodLabel}
          </span>
        ))}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="detail-tabs" aria-label="Zählerdetails">
          <TabsTrigger ref={overviewTab} value="overview">Verstehen</TabsTrigger>
          <TabsTrigger value="manage">Verwalten</TabsTrigger>
          <TabsTrigger value="rates">Konditionen</TabsTrigger>
          <TabsTrigger value="readings">Ablesungen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PeriodUnderstanding meter={meter} contract={contract} readings={readings} rates={rates} asOf={asOf} />
        </TabsContent>
        <TabsContent value="manage">
          <div className="detail-toolbar">
            <h2>Zeitraumdetails</h2>
        {contract && <BillingContinuation meter={meter} period={contract} contracts={contracts} rates={rates}
          onSelect={id => { setSelectedContractId(id); setActiveTab('overview'); router.replace(`/meter/${meter.id}?period=${id}`, { scroll: false }); requestAnimationFrame(() => overviewTab.current?.focus()); }}
          onReload={data => { setContracts(data.contracts); setRatesByContract(data.ratesByContract); }}
          onSaved={result => {
            setContracts(previous => [result.contract, ...previous.filter(item => item.id !== result.contract.id).map(item => item.id === result.previous.id ? result.previous : item)]);
            setRatesByContract(previous => ({ ...previous, [result.contract.id]: result.rates }));
            router.refresh();
          }} />}
          </div>
          <Card>
            <CardHeader className="detail-card-header">
              <CardTitle>Zeitraum</CardTitle>
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Details bearbeiten" disabled={!contract || actionBusy}
                  onClick={() => {
                    setActionError('');
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
                    onClick={() => { setIsEditing(false); setActionError(''); }} disabled={actionBusy} aria-label="Details bearbeiten abbrechen"
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
              {actionErrorTarget === 'details' && actionError && <p className="form-error" role="alert">{actionError}</p>}
              <dl className="period-details">
                <div>
                  <dt>
                    <Building2 className="h-4 w-4" /> Anbieter
                  </dt>
                  <dd>
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
                  <div>
                    <dt>
                      <Calendar className="h-4 w-4" /> Beginn
                    </dt>
                    <dd>
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
                <div>
                  <dt>Bis einschließlich</dt>
                  <dd>{contract?.period_end ? formatDate(inclusiveEnd(contract), locale) : 'Offen'}
                    {contract && <Button ref={endButton} variant="ghost" size="sm" className="period-end-action" onClick={() => setEndDialogOpen(true)}>{contract.period_end ? 'Ende ändern' : 'Ende festlegen'}</Button>}
                  </dd>
                </div>
                <div>
                  <dt>
                    <HandCoins className="h-4 w-4 shrink-0" /> Schlussabrechnung
                  </dt>
                  <dd>
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
                  <div>
                    <dt>
                      <Gauge className="h-4 w-4" /> Umrechnungsfaktor
                    </dt>
                    <dd>
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
          <section className="detail-readings" aria-labelledby="readings-title">
              <div className="detail-toolbar">
                <h2 id="readings-title">Ablesungen</h2>
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
              {actionErrorTarget === 'readings' && actionError && <p className="form-error" role="alert">{actionError}</p>}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">Zählerstand ({meter.type === 'gas' ? 'm³' : 'kWh'})</TableHead>
                      <TableHead><span className="sr-only">Aktionen</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!readings.length && <TableRow><TableCell colSpan={3}>Noch keine Ablesungen erfasst.</TableCell></TableRow>}
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
          </section>
        </TabsContent>
      </Tabs>

      {contract && <PeriodEndDialog period={contract} open={endDialogOpen} onClose={() => setEndDialogOpen(false)} returnFocus={() => endButton.current?.focus()} onSaved={updated => setContracts(previous => previous.map(item => item.id === updated.id ? updated : item))} />}

    </div>
  );
}
