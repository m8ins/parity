'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/date-utils';
import { Meter, Contract, Rate, Reading } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Zap,
  Flame,
  Gauge,
  Pencil,
  Check,
  X,
  Plus,
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
  initialContract,
  initialRates,
  initialReadings,
}: {
  initialMeter: Meter | null;
  initialContract: Contract | null;
  initialRates: Rate[];
  initialReadings: Reading[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [meter, setMeter] = useState<Meter | null>(initialMeter);
  const [contract] = useState<Contract | null>(initialContract);
  const [readings, setReadings] = useState<Reading[]>(initialReadings);
  const [isEditing, setIsEditing] = useState(false);
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');

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

  const handleSavePeriodStart = async () => {
    if (!contract || !editPeriodStart) return;

    const { error } = await supabase
      .from('contracts')
      .update({ period_start: editPeriodStart })
      .eq('id', contract.id);

    if (!error) setIsEditing(false);
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

  if (!meter) return <div className="p-8">Zähler nicht gefunden</div>;

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
                    onClick={handleSavePeriodStart}
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
                        formatDate(contract.period_start)
                      )}
                    </dd>
                  </div>
                )}
                {contract?.period_end && (
                  <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                    <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                      <Calendar className="h-4 w-4" /> Periode Ende
                    </dt>
                    <dd className="text-sm font-medium">
                      {formatDate(contract.period_end)}
                    </dd>
                  </div>
                )}
                {meter.type === 'gas' && initialRates.length > 0 && (
                  <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                    <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                      <Gauge className="h-4 w-4" /> Umrechnungsfaktor
                    </dt>
                    <dd className="text-sm font-medium flex items-center gap-2">
                      {initialRates[initialRates.length - 1].umrechnungsfaktor}{' '}
                      kWh/m³
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
                  initialData={initialRates}
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
                        <TableCell>{formatDate(r.date)}</TableCell>
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
    </div>
  );
}
