'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Contract, Meter, Rate, Reading } from '@/lib/types';
import { calculateProjection, periodEnd, readingsInPeriod } from '@/lib/calculations';
import { formatDate } from '@/lib/date-utils';
import { periodIsFinished } from '@/lib/billing-period';
import { formatReading } from '@/lib/readings';
import { ContractChart } from './contract-chart';
import { ContractMonthlyTable } from './contract-monthly-table';

const money = (value: number) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const quantity = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
const date = (value: string) => formatDate(value, 'de-DE');
const outcome = (value: number) => value === 0 ? 'Keine Nachzahlung erwartet' : `${money(Math.abs(value))} ${value > 0 ? 'Erstattung' : 'Nachzahlung'}`;

export function PeriodUnderstanding({ meter, contract, readings, rates, compact = false, asOf, detailsHref }: {
  meter: Meter; contract: Contract | null; readings: Reading[]; rates: Rate[]; compact?: boolean; asOf?: string; detailsHref?: string;
}) {
  const summaryLink = (children: ReactNode) => compact && detailsHref
    ? <Link className="meter-outcome-link" href={detailsHref}><div className="meter-outcome-summary">{children}</div><ArrowRight className="meter-outcome-arrow" aria-hidden="true" /><span className="sr-only">Einschätzung ansehen</span></Link>
    : children;
  if (!contract) return summaryLink(<div className="forecast-empty"><p>Für die Prognose fehlt ein Abrechnungszeitraum.</p></div>);
  const end = periodEnd(contract);
  const today = asOf ?? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const completed = periodIsFinished(contract, today);
  const samples = readingsInPeriod(contract, readings).filter(r => r.date <= today);
  const first = samples[0], last = samples.at(-1);
  const result = calculateProjection(meter, contract, samples, rates);
  const settlement = contract.settlement_amount;
  const hasSettlement = settlement != null;
  const difference = result?.difference;
  const outcomeValue = hasSettlement ? settlement! : difference;
  const resultClass = `understand-result ${outcomeValue == null || outcomeValue === 0 ? 'understand-result-neutral' : outcomeValue < 0 ? 'understand-result-due' : 'understand-result-refund'}`;
  const ambiguous = rates.some((rate, index) => rates.some((other, otherIndex) => index !== otherIndex && rate.effective_from === other.effective_from));
  const hint = ambiguous ? 'Konditionen sind für dasselbe Datum mehrfach erfasst. Bitte die Konditionshistorie prüfen.' : samples.length < 2
    ? samples.length === 1 ? 'Noch eine Ablesung für die Prognose nötig.' : 'Erfasse zwei Zählerstände für eine Prognose.'
    : !result ? 'Ablesungen und Gasfaktoren prüfen: Die Prognose ist noch nicht möglich.'
      : result.projectedYearlyCost === null ? 'Preise fehlen. Die Kosten sind noch nicht schätzbar.'
        : difference == null ? 'Abschläge fehlen. Eine Nachzahlung ist noch nicht schätzbar.' : null;
  const OutcomeTitle = compact ? 'p' : 'h2';
  const lastDay = new Date(Date.parse(end) - 86400000).toISOString().slice(0, 10);
  return <section className={`understand ${compact ? 'understand-compact' : ''}`} aria-label={compact ? undefined : 'Verbrauch und Kosten verstehen'}>
    {compact && <p className="text-sm text-muted-foreground">{contract.period_end ? `${date(contract.period_start)} – ${date(lastDay)}` : `Ab ${date(contract.period_start)} · offen`}</p>}
    {compact && result && <section className="meter-card-chart" aria-label="Verbrauchsverlauf">
      <div className="understand-legend meter-chart-legend"><span>Aus Ablesungen</span><span>Hochrechnung</span></div>
      {first.date !== contract.period_start && <p className="text-sm text-muted-foreground">Aus Ablesungen: Verbrauch seit {date(first.date)}. Davor unbekannt; die Hochrechnung gilt ab Zeitraumstart.</p>}
      <ContractChart data={result.chartData} unit="kWh" isGood compact />
    </section>}
    {summaryLink(<>
      {hasSettlement ? <div className={resultClass}>
      <OutcomeTitle className="understand-outcome numeric">{settlement === 0 ? 'Abrechnung ausgeglichen' : outcome(settlement!)}</OutcomeTitle>
      <p className="text-sm text-muted-foreground">Erfasste Schlussabrechnung{contract.settlement_date ? ` · ${date(contract.settlement_date)}` : ''}</p>
    </div> : difference != null ? <div className={resultClass}>
      <OutcomeTitle className="understand-outcome numeric">{difference === 0 ? outcome(difference) : `Voraussichtlich ${outcome(difference)}`}</OutcomeTitle>
    </div> : null}
    {!hasSettlement && hint && <div className="understand-result understand-result-neutral"><p>{hint}</p></div>}
    </>)}
    {!compact && <>
      {result && <Tabs key={contract.id} defaultValue="chart" className="understand-views">
        <div className="understand-view-toolbar">
          <div className="understand-legend text-sm"><span>Aus Ablesungen</span><span>Hochrechnung</span></div>
          <TabsList className="understand-view-switch" aria-label="Verbrauchsansicht">
            <TabsTrigger value="chart">Verlauf</TabsTrigger>
            <TabsTrigger value="monthly" data-view="monthly">Monatswerte</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chart">
          <section className="understand-chart" aria-label="Verbrauchsverlauf">
            {first.date !== contract.period_start && <p className="text-sm text-muted-foreground">Aus Ablesungen: Verbrauch seit {date(first.date)}. Davor unbekannt; die Hochrechnung gilt ab Zeitraumstart.</p>}
            <ContractChart data={result.chartData} unit="kWh" isGood />
          </section>
        </TabsContent>
        <TabsContent value="monthly">
          <p className="text-sm text-muted-foreground">Nur der durch Ablesungen abgedeckte Zeitraum. Teilmonate sind mit ihren genauen Daten aufgeführt. Verbrauch zwischen Ablesungen und Kosten sind geschätzt; „bis“ ist exklusiv.</p>
          <ContractMonthlyTable breakdown={result.monthlyBreakdown} />
        </TabsContent>
      </Tabs>}
      {result && <details className="understand-section"><summary>Kosten und Abschlag</summary>
        <dl className="understand-totals numeric">
          <div><dt>Geschätzte Kosten</dt><dd>{result.projectedYearlyCost === null ? 'Nicht berechenbar' : money(result.projectedYearlyCost)}</dd></div>
          <div><dt>Hinterlegte Abschläge</dt><dd>{result.currentYearlyPayment === null ? 'Nicht hinterlegt' : money(result.currentYearlyPayment)}</dd></div>
          <div><dt>Hochgerechneter Verbrauch</dt><dd>{quantity(result.projectedYearlyConsumption)} kWh</dd></div>
          {hasSettlement && difference != null && <div><dt>Prognose</dt><dd>{outcome(difference)}</dd></div>}
          {!completed && result.recommendedMonthlyPayment !== null && <div><dt>Abschlag zur Orientierung</dt><dd>{money(result.recommendedMonthlyPayment)} / Monat</dd></div>}
        </dl>
        <p className="text-sm text-muted-foreground">Für den gesamten Zeitraum gerechnet, mit den hinterlegten Abschlägen. Tatsächliche Zahlungen sind nicht erfasst.</p>
      </details>}
      <details className="understand-section"><summary>Ablesungen</summary>
        {first ? <dl className="understand-totals numeric">
          <div><dt>{date(first.date)}</dt><dd>{formatReading(first.value)} {meter.type === 'gas' ? 'm³' : 'kWh'}</dd></div>
          {samples.length > 1 && <div><dt>{date(last!.date)}</dt><dd>{formatReading(last!.value)} {meter.type === 'gas' ? 'm³' : 'kWh'}</dd></div>}
          {result && <div><dt>Verbrauch dazwischen</dt><dd>{meter.type === 'gas' && <>{formatReading(last!.value - first.value)} m³ → </>}{quantity(result.observedConsumption)} kWh</dd></div>}
          {!result && samples.length > 1 && last!.value >= first.value && <div><dt>Standdifferenz</dt><dd>{formatReading(last!.value - first.value)} {meter.type === 'gas' ? 'm³' : 'kWh'}</dd></div>}
        </dl> : <p>Noch keine Ablesung in diesem Zeitraum.</p>}
        {samples.length > 0 && <p className="text-sm text-muted-foreground">{samples.length} {samples.length === 1 ? 'Ablesung' : 'Ablesungen'} im Zeitraum{last?.date === end ? ' · einschließlich Abschlussstand' : ''}.</p>}
      </details>
      <details className="understand-section"><summary>Wie wird gerechnet?</summary>
        <p>Stand: {date(today)}.{result ? ` Basis: ${result.daysTracked} Tage, ${date(result.observedStart)} bis ${date(result.observedEnd)}.` : 'Mindestens zwei Ablesungen an verschiedenen Tagen sind nötig.'}</p>
        <p>{meter.monthly_distribution?.length === 12 ? 'Individuelle Monatsverteilung' : meter.type === 'gas' ? 'Saisonale Gasverteilung (H0-Näherung)' : 'Gleichmäßige Stromverteilung'}. {meter.type === 'gas' ? 'Gasstände werden mit dem jeweils gültigen Faktor von m³ in kWh umgerechnet.' : ''} Die Hochrechnung gilt für den gesamten Zeitraum.</p>
        {meter.monthly_distribution?.length === 12 && <p className="numeric">Jan–Dez: {meter.monthly_distribution.map(w => `${quantity(w * 100)} %`).join(' · ')}</p>}
        <p>Preise und Abschläge gelten ab ihrem Gültigkeitstag. Monatsbeträge werden pro Tag mit × 12 / Kalendertage des Jahres verrechnet. Der monatliche Orientierungswert gilt für den ganzen Zeitraum, nicht nur die Restmonate.</p>
        <p>Monatswerte sind linear interpoliert. Ihre Kostensumme kann bei Preiswechseln von der saisonalen Hochrechnung abweichen. Eine erfasste Schlussabrechnung zeigt das tatsächliche Ergebnis.</p>
        <p>{contract.period_end ? `Abrechnungszeitraum bis einschließlich ${date(lastDay)}. Eine Ablesung am Folgetag zählt als Abschlussstand.` : `Das Zeitraumende ist offen. Für diese Schätzung rechnen wir vom ${date(contract.period_start)} bis einschließlich ${date(lastDay)} mit einem Jahr. Das ist kein eingetragenes Ende; spätere Konditionen bleiben gespeichert und werden bei einer Erweiterung des Berechnungszeitraums berücksichtigt.`}</p>
      </details>
    </>}
  </section>;
}
