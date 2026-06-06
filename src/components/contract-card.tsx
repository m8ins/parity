import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Meter, Reading } from "@/lib/types"
import { ProjectionResult } from "@/lib/calculations"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Plus, Zap, Flame, AlertTriangle, CheckCircle, MoreHorizontal, Trash, Pencil } from "lucide-react"
import Link from "next/link"
import { ReadingDialog } from "./reading-dialog"
import { ContractChart } from "./contract-chart"

interface ContractCardProps {
    meter: Meter
    readings: Reading[]
    currentAbschlag: number
    projection: ProjectionResult | null
    onUpdate: () => void
    onReadingAdded: (meterId: string, reading: Reading) => void
    onDelete: (id: string) => void
}

export function ContractCard({ meter, readings, currentAbschlag, projection, onUpdate, onReadingAdded, onDelete }: ContractCardProps) {
    const isGas = meter.type === 'gas'
    const Icon = isGas ? Flame : Zap
    const diff = projection ? projection.difference : 0
    const isGood = diff >= 0

    const [isRenaming, setIsRenaming] = useState(false)
    const [newName, setNewName] = useState('')
    const supabase = createClient()

    const handleRename = async () => {
        if (!newName.trim()) return
        const { error } = await supabase.from('meters').update({ name: newName }).eq('id', meter.id)
        if (!error) {
            setIsRenaming(false)
            onUpdate()
        }
    }

    return (
        <>
            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zähler umbenennen</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            id="name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename()
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenaming(false)}>Abbrechen</Button>
                        <Button onClick={handleRename}>Speichern</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-row items-center gap-2">
                        <Icon className={`h-4 w-4 ${isGas ? "text-orange-500" : "text-yellow-500"}`} />
                        <CardTitle className="font-medium">
                            <Link href={`/meter/${meter.id}`} className="hover:underline">
                                {meter.name}
                            </Link>
                        </CardTitle>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => {
                                setNewName(meter.name)
                                setIsRenaming(true)
                            }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Umbenennen
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(meter.id)} className="text-red-600">
                                <Trash className="mr-2 h-4 w-4" />
                                Löschen
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="flex-1">
                    <div className="text-2xl font-bold">
                        {projection ? `${projection.projectedYearlyCost.toFixed(2)} €` : "Keine Daten"}
                        {projection && <span className="text-xs font-normal text-muted-foreground ml-2">geschätzt / Jahr</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Aktueller Abschlag: {(currentAbschlag * 12).toFixed(2)} € / Jahr
                    </p>

                    {projection && (
                        <div className={`mt-4 rounded-md p-2 flex items-center gap-2 text-sm ${isGood ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"}`}>
                            {isGood ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                            <div>
                                {isGood ? (
                                    <span>Erstattung: <strong>{diff.toFixed(2)} €</strong></span>
                                ) : (
                                    <span>Nachzahlung: <strong>{Math.abs(diff).toFixed(2)} €</strong></span>
                                )}
                            </div>
                        </div>
                    )}

                    {projection && (
                        <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                            <span>Abschlag deckt: {Math.round(projection.paidUsage)} kWh</span>
                        </div>
                    )}

                    {projection && projection.chartData && (
                        <ContractChart
                            data={projection.chartData}
                            unit="kWh"
                            goal={projection.paidUsage}
                            className="mt-4"
                        />
                    )}

                    <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                        <span>{readings.length} Ablesungen</span>
                    </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                    <ReadingDialog
                        meterId={meter.id}
                        lastReadingValue={readings[readings.length - 1]?.value}
                        onSuccess={(reading) => onReadingAdded(meter.id, reading)}
                    >
                        <Button variant="outline" className="flex-1">
                            <Plus className="mr-2 h-4 w-4" /> Ablesung
                        </Button>
                    </ReadingDialog>
                </CardFooter>
            </Card>
        </>
    )
}
