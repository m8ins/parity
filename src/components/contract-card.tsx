import { Contract, Reading } from "@/lib/types"
import { ProjectionResult } from "@/lib/calculations"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Plus, Zap, Flame, AlertTriangle, CheckCircle, MoreHorizontal, Trash, Pencil } from "lucide-react"
import Link from "next/link"
import { ReadingDialog } from "./reading-dialog"
import { ContractChart } from "./contract-chart"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

interface ContractCardProps {
    contract: Contract
    readings: Reading[]
    currentPayment: number
    projection: ProjectionResult | null
    onUpdate: () => void
    onDelete: (id: string) => void
}

export function ContractCard({ contract, readings, currentPayment, projection, onUpdate, onDelete }: ContractCardProps) {
    const isGas = contract.type === 'gas'
    const Icon = isGas ? Flame : Zap
    const diff = projection ? projection.difference : 0
    const isGood = diff >= 0

    const [isRenaming, setIsRenaming] = useState(false)
    const [newName, setNewName] = useState(contract.name)
    const supabase = createClient()

    const handleRename = async () => {
        const { error } = await supabase
            .from('contracts')
            .update({ name: newName })
            .eq('id', contract.id)

        if (!error) {
            onUpdate()
            setIsRenaming(false)
        }
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-row items-center gap-2">

                    <Icon className={`h-4 w-4 ${isGas ? "text-orange-500" : "text-yellow-500"}`} />
                    <CardTitle className="font-medium">
                        <Link href={`/contract/${contract.id}`} className="hover:underline">
                            {contract.name}
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
                        <DropdownMenuItem onClick={() => {
                            setNewName(contract.name)
                            setIsRenaming(true)
                        }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(contract.id)} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename Contract</DialogTitle>
                            <DialogDescription>
                                Enter a new name for your contract.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="col-span-3"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRename()
                                    }}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRenaming(false)}>Cancel</Button>
                            <Button onClick={handleRename}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-2xl font-bold">
                    {projection ? `${projection.projectedYearlyCost.toFixed(2)} €` : "No Data"}
                    {projection && <span className="text-xs font-normal text-muted-foreground ml-2">est. / year</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                    Current Pay: {(currentPayment * 12).toFixed(2)} € / year
                </p>

                {projection && (
                    <div className={`mt-4 rounded-md p-2 flex items-center gap-2 text-sm ${isGood ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"}`}>
                        {isGood ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <div>
                            {isGood ? (
                                <span>Safe! Refund: <strong>{diff.toFixed(2)} €</strong></span>
                            ) : (
                                <span>Backpayment: <strong>{Math.abs(diff).toFixed(2)} €</strong></span>
                            )}
                        </div>
                    </div>
                )}

                {projection && projection.chartData && (
                    <ContractChart
                        data={projection.chartData}
                        unit="kWh"
                        className="mt-4"
                    />
                )}

                <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                    <span>{readings.length} readings</span>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                <ReadingDialog contractId={contract.id} onSuccess={onUpdate}>
                    <Button variant="outline" className="flex-1">
                        <Plus className="mr-2 h-4 w-4" /> Reading
                    </Button>
                </ReadingDialog>


            </CardFooter>
        </Card>
    )
}
