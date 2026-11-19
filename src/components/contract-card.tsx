import { useRef, useState } from 'react';
import { Meter, MeterData } from '@/lib/types';
import { PeriodUnderstanding } from './PeriodUnderstanding';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { RenameMeterDialog } from './RenameMeterDialog';
import { DeleteMeterDialog } from './DeleteMeterDialog';
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
  onUpdate: (meter: Meter) => void;
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

  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const nextDialog = useRef<'rename' | 'delete' | null>(null);

  return (
    <>
      {isRenaming && <RenameMeterDialog meter={meter} open onOpenChange={setIsRenaming} onSaved={onUpdate} returnFocus={() => menuButton.current?.focus()} />}
      {isDeleting && <DeleteMeterDialog meter={meter} open onOpenChange={setIsDeleting} onDeleted={() => onDelete(meter.id)} returnFocus={() => menuButton.current?.focus()} />}
      <Card
        className="meter-card flex min-w-0 flex-col border-2 border-foreground shadow-none"
        data-meter-id={meter.id}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex min-w-0 flex-row items-center gap-2">
            <Icon className={`h-4 w-4 text-foreground`} />
            <h2 className="meter-card-title">
              <Link href={`/meter/${meter.id}`} className="meter-name-link">
                {meter.name}
              </Link>
            </h2>
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                ref={menuButton}
                variant="ghost"
                size="icon-sm"
                aria-label={`${meter.name} verwalten`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={event => {
              const next = nextDialog.current;
              if (!next) return;
              event.preventDefault();
              nextDialog.current = null;
              // Let the menu finish focus/pointer cleanup before mounting a dialog.
              requestAnimationFrame(() => next === 'rename' ? setIsRenaming(true) : setIsDeleting(true));
            }}>
              <DropdownMenuItem
                onSelect={() => {
                  nextDialog.current = 'rename';
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Umbenennen
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => { nextDialog.current = 'delete'; }}
                variant="destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Entfernen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="meter-card-content flex-1 min-w-0">
          <PeriodUnderstanding meter={meter} contract={selectedContract} readings={readings} rates={rates} compact detailsHref={`/meter/${meter.id}${selectedContract ? `?period=${selectedContract.id}` : ''}`} />
          <div className="meter-reading-summary">
            <p>Letzter Stand:</p>
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
