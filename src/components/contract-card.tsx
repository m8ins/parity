import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Meter, MeterData } from '@/lib/types';
import { PeriodUnderstanding } from './PeriodUnderstanding';
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
import { Button } from '@/components/ui/button';
import { Plus, Zap, Flame, MoreHorizontal, Trash, Pencil } from 'lucide-react';
import Link from 'next/link';
import { ReadingDialog } from './reading-dialog';
import { Reading } from '@/lib/types';
import {
  latestReading,
  formatReading,
  formatReadingDate,
} from '@/lib/readings';

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

  const { contracts, ratesByContract, readings } = meterData;

  const selectedContract = contracts[0] ?? null;
  const rates = selectedContract
    ? (ratesByContract[selectedContract.id] ?? [])
    : [];

  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const supabase = createClient();

  const handleRename = async () => {
    if (!newName.trim()) return;
    if (renameBusy) return;
    setRenameBusy(true);
    setRenameError('');
    try {
      const { error } = await supabase
        .from('meters')
        .update({ name: newName })
        .eq('id', meter.id);
      if (error) throw error;
      setIsRenaming(false);
      onUpdate();
    } catch {
      setRenameError(
        'Der Name konnte nicht gespeichert werden. Bitte versuche es erneut.',
      );
    } finally {
      setRenameBusy(false);
    }
  };

  return (
    <>
      <Dialog
        open={isRenaming}
        onOpenChange={(value) => {
          if (!renameBusy) setIsRenaming(value);
        }}
      >
        <DialogContent aria-busy={renameBusy} showCloseButton={!renameBusy}>
          <DialogHeader>
            <DialogTitle>Zähler umbenennen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <label htmlFor={`name-${meter.id}`} className="parity-label">
              Zählername
            </label>
            <Input
              id={`name-${meter.id}`}
              disabled={renameBusy}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
          </div>
          {renameError && (
            <p className="form-error" role="alert">
              {renameError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={renameBusy}
              onClick={() => setIsRenaming(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleRename} disabled={renameBusy}>
              {renameBusy ? 'Wird gespeichert …' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card
        className="flex min-w-0 flex-col border-2 border-foreground shadow-none"
        data-meter-id={meter.id}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex min-w-0 flex-row items-center gap-2">
            <Icon className={`h-4 w-4 text-foreground`} />
            <CardTitle className="min-w-0 font-medium break-words">
              <Link href={`/meter/${meter.id}`} className="hover:underline">
                {meter.name}
              </Link>
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${meter.name} verwalten`}
              >
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
            {lastReading ? (
              <>
                <strong
                  className="meter-reading-number numeric"
                  tabIndex={0}
                  aria-label={`Letzter Zählerstand ${formatReading(lastReading.value)} ${isGas ? 'm³' : 'kWh'}`}
                >
                  {formatReading(lastReading.value)}{' '}
                  <small>{isGas ? 'm³' : 'kWh'}</small>
                </strong>
                <p>
                  Abgelesen am{' '}
                  <time dateTime={lastReading.date}>
                    {formatReadingDate(lastReading.date)}
                  </time>
                </p>
              </>
            ) : (
              <p>Noch keine Ablesung vorhanden.</p>
            )}
            <div role="status" className="meter-confirmation">
              {confirmation}
            </div>
          </div>
          <PeriodUnderstanding
            meter={meter}
            contract={selectedContract}
            readings={readings}
            rates={rates}
            compact
          />
          {/* <Link className="understand-link" href={`/meter/${meter.id}?period=${selectedContract?.id ?? ''}`}>Details ansehen</Link> */}
        </CardContent>
        <CardFooter className="flex gap-2">
          <ReadingDialog
            meterId={meter.id}
            meterName={meter.name}
            meterType={meter.type}
            lastReading={lastReading}
            onSuccess={(reading) => {
              onReadingAdded(meter.id, reading);
              setConfirmation(
                `Gespeichert: ${formatReading(reading.value)} ${isGas ? 'm³' : 'kWh'} am ${formatReadingDate(reading.date)}.`,
              );
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
