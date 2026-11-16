"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Meter, Reading, MeterData } from "@/lib/types"
import { loadMeterData } from "@/lib/contracts"
import { ContractForm } from "./contract-form"
import { ContractCard } from "./contract-card"
import { DesignPanel } from "./design-panel"
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
    const [error, setError] = useState("")
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
            setError('Der Zähler konnte nicht gelöscht werden. Bitte versuche es erneut.')
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
        <main className="parity-page">
            <h1>Deine Zähler</h1>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="page-intro">Zähler finden, Stand erfassen und Ablesungen im Blick behalten.</p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                            <button type="button" className="add-meter">
                                <Plus className="h-8 w-8" aria-hidden="true" />
                                <strong>Zähler hinzufügen</strong>
                                <span className="text-sm">Strom oder Gas erfassen</span>
                            </button>
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
            {process.env.NODE_ENV === "development" && <DesignPanel />}
        </main>
    )
}
