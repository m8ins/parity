"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Contract, Reading, ContractPrice, ContractPayment } from "@/lib/types"
import { calculateProjection } from "@/lib/calculations"
import { ContractForm } from "./contract-form"
import { ContractCard } from "./contract-card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

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
            .order('created_at', { ascending: true })

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

                {/* Add New Contract Dialog */}
                <div className="md:col-span-2 lg:col-span-1">
                    <Dialog open={isFormExpanded} onOpenChange={setIsFormExpanded}>
                        <DialogTrigger asChild>
                            <Card className="h-full border-dashed flex flex-col items-center justify-center p-6 text-center hover:bg-neutral-50 dark:hover:bg-slate-900 transition-colors cursor-pointer min-h-[200px]">
                                <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800 mb-4">
                                    <Plus className="h-6 w-6 text-neutral-500" />
                                </div>
                                <h3 className="font-semibold text-lg">Add Contract</h3>
                                <p className="text-sm text-muted-foreground mt-1">Track another electricity or gas contract</p>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add Contract</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                <ContractForm
                                    user_id={user.id}
                                    onSuccess={() => {
                                        fetchData();
                                        setIsFormExpanded(false);
                                    }}
                                    onCancel={() => setIsFormExpanded(false)}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    )
}
