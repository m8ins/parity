"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Meter, Reading, MeterData } from "@/lib/types"
import { loadMeterData } from "@/lib/contracts"
import { ContractForm } from "./contract-form"
import { ContractCard } from "./contract-card"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

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
            newData[meter.id] = await loadMeterData(supabase, meter.id)
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
            const existing = prev[meterId] || { contracts: [], ratesByContract: {}, readings: [] }
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
                    const mData = data[meter.id] || { contracts: [], ratesByContract: {}, readings: [] }

                    return (
                        <ContractCard
                            key={meter.id}
                            meter={meter}
                            meterData={mData}
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
