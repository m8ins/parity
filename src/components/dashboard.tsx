"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Contract, Reading, ContractPrice, ContractPayment } from "@/lib/types"
import { calculateProjection, ProjectionResult } from "@/lib/calculations"
import { ContractForm } from "./contract-form"
import { ReadingDialog } from "./reading-dialog" // Still useful, but might move inside Detail
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Plus, Zap, Flame, AlertTriangle, CheckCircle, ChevronRight, MoreHorizontal, Trash } from "lucide-react"
import Link from "next/link"

export function Dashboard({ user }: { user: any }) {
    const [contracts, setContracts] = useState<Contract[]>([])
    const [data, setData] = useState<Record<string, {
        readings: Reading[],
        prices: ContractPrice[],
        payments: ContractPayment[]
    }>>({})
    const [isFormExpanded, setIsFormExpanded] = useState(false)

    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchData = async () => {
        setLoading(true)
        const { data: contractsData } = await supabase
            .from('contracts')
            .select('*')
            .order('created_at', { ascending: false })

        if (contractsData) {
            setContracts(contractsData as Contract[])

            const newData: typeof data = {}

            for (const contract of contractsData) {
                const [readingsRes, pricesRes, paymentsRes] = await Promise.all([
                    supabase.from('readings').select('*').eq('contract_id', contract.id).order('date', { ascending: true }),
                    supabase.from('contract_prices').select('*').eq('contract_id', contract.id).order('valid_from', { ascending: true }),
                    supabase.from('contract_payments').select('*').eq('contract_id', contract.id).order('valid_from', { ascending: true })
                ])

                newData[contract.id] = {
                    readings: readingsRes.data as Reading[] || [],
                    prices: pricesRes.data as ContractPrice[] || [],
                    payments: paymentsRes.data as ContractPayment[] || []
                }
            }
            setData(newData)
        }
        setLoading(false)
    }

    const deleteContract = async (id: string) => {
        const { error } = await supabase.from('contracts').delete().eq('id', id)
        if (error) {
            console.error('Error deleting contract:', error)
        } else {
            fetchData()
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="container mx-auto p-4 space-y-8">

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Contract List */}
                {contracts.map(contract => {
                    const cData = data[contract.id] || { readings: [], prices: [], payments: [] }
                    const projection = calculateProjection(contract, cData.readings, cData.prices, cData.payments)

                    // Get Current Payment for Display
                    // Last one in the list (sorted by valid_from)
                    const currentPayment = cData.payments[cData.payments.length - 1]?.monthly_payment || 0

                    return (
                        <ContractCard
                            key={contract.id}
                            contract={contract}
                            readings={cData.readings}
                            currentPayment={currentPayment}
                            projection={projection}
                            onUpdate={fetchData}
                            onDelete={deleteContract}
                        />
                    )
                })}

                {/* Add New Contract Card */}
                <div className="md:col-span-2 lg:col-span-1">
                    {contracts.length > 0 && !isFormExpanded ? (
                        <Card className="h-full border-dashed flex flex-col items-center justify-center p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => setIsFormExpanded(true)}>
                            <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800 mb-4">
                                <Plus className="h-6 w-6 text-slate-500" />
                            </div>
                            <h3 className="font-semibold text-lg">Add Contract</h3>
                            <p className="text-sm text-muted-foreground mt-1">Track another electricity or gas contract</p>
                            <Button variant="ghost" className="mt-4">Add Contract</Button>
                        </Card>
                    ) : (
                        <ContractForm
                            user_id={user.id}
                            onSuccess={() => {
                                fetchData();
                                setIsFormExpanded(false);
                            }}
                            onCancel={contracts.length > 0 ? () => setIsFormExpanded(false) : undefined}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

function ContractCard({ contract, readings, currentPayment, projection, onUpdate, onDelete }: {
    contract: Contract,
    readings: Reading[],
    currentPayment: number,
    projection: ProjectionResult | null,
    onUpdate: () => void,
    onDelete: (id: string) => void
}) {
    const isGas = contract.type === 'gas'
    const Icon = isGas ? Flame : Zap
    const diff = projection ? projection.difference : 0
    const isGood = diff >= 0

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className=" font-medium">
                    <Link href={`/contract/${contract.id}`} className="hover:underline">
                        {contract.name}
                    </Link>
                </CardTitle>
                <Icon className={`h-4 w-4 ${isGas ? "text-orange-500" : "text-yellow-500"}`} />
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

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onDelete(contract.id)} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>
    )
}
