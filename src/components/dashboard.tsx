"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Meter, Contract, Rate, Reading } from "@/lib/types"
import { calculateProjection } from "@/lib/calculations"
import { ContractForm } from "./contract-form"
import { ContractCard } from "./contract-card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

type MeterData = {
    contract: Contract | null
    rates: Rate[]
    readings: Reading[]
}

export function Dashboard({
    user,
    initialMeters,
    initialData
}: {
    user: User
    initialMeters: Meter[]
    initialData: Record<string, MeterData>
}) {
    const [meters, setMeters] = useState<Meter[]>(initialMeters)
    const [data, setData] = useState<Record<string, MeterData>>(initialData)
    const [isFormExpanded, setIsFormExpanded] = useState(false)

    const supabase = createClient()

    const fetchData = async () => {
        const { data: metersData } = await supabase
            .from('meters')
            .select('*')
            .order('created_at', { ascending: true })

        if (!metersData) return
        setMeters(metersData as Meter[])

        const newData: Record<string, MeterData> = {}

        for (const meter of metersData) {
            const contractRes = await supabase
                .from('contracts')
                .select('*')
                .eq('meter_id', meter.id)
                .order('period_start', { ascending: false })
                .limit(1)
                .single()

            const contract = contractRes.data as Contract | null

            const [ratesRes, readingsRes] = await Promise.all([
                contract
                    ? supabase.from('rates').select('*').eq('contract_id', contract.id).order('effective_from', { ascending: true })
                    : Promise.resolve({ data: [] }),
                supabase.from('readings').select('*').eq('meter_id', meter.id).order('date', { ascending: true }),
            ])

            newData[meter.id] = {
                contract,
                rates: (ratesRes.data as Rate[]) || [],
                readings: (readingsRes.data as Reading[]) || [],
            }
        }
        setData(newData)
    }

    const deleteMeter = async (id: string) => {
        const { error } = await supabase.from('meters').delete().eq('id', id)
        if (error) {
            console.error('Error deleting meter:', error)
        } else {
            fetchData()
        }
    }

    const handleReadingAdded = (meterId: string, reading: Reading) => {
        setData(prev => {
            const existing = prev[meterId] || { contract: null, rates: [], readings: [] }
            const nextReadings = [...existing.readings, reading].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            return {
                ...prev,
                [meterId]: { ...existing, readings: nextReadings }
            }
        })
    }

    return (
        <div className="container mx-auto p-4 space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {meters.map(meter => {
                    const mData = data[meter.id] || { contract: null, rates: [], readings: [] }
                    const projection = mData.contract
                        ? calculateProjection(meter, mData.contract, mData.readings, mData.rates)
                        : null
                    const currentAbschlag = mData.rates[mData.rates.length - 1]?.abschlag || 0

                    return (
                        <ContractCard
                            key={meter.id}
                            meter={meter}
                            readings={mData.readings}
                            currentAbschlag={currentAbschlag}
                            projection={projection}
                            onUpdate={fetchData}
                            onReadingAdded={handleReadingAdded}
                            onDelete={deleteMeter}
                        />
                    )
                })}

                <div className="md:col-span-2 lg:col-span-1">
                    <Dialog open={isFormExpanded} onOpenChange={setIsFormExpanded}>
                        <DialogTrigger asChild>
                            <Card className="h-full border-dashed flex flex-col items-center justify-center p-6 text-center hover:bg-neutral-50 dark:hover:bg-slate-900 transition-colors cursor-pointer min-h-[200px]">
                                <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800 mb-4">
                                    <Plus className="h-6 w-6 text-neutral-500" />
                                </div>
                                <h3 className="font-semibold text-lg">Zähler hinzufügen</h3>
                                <p className="text-sm text-muted-foreground mt-1">Strom oder Gas Zähler erfassen</p>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Zähler anlegen</DialogTitle>
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
