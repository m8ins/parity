"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Meter, Reading, MeterData } from "@/lib/types"
import { loadMeterData } from "@/lib/contracts"
import { ContractForm } from "./contract-form"
import { ContractCard } from "./contract-card"
import { DesignPanel } from "./design-panel"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
    const [message, setMessage] = useState("")
    const heading = useRef<HTMLHeadingElement>(null)
    const router = useRouter()
    const [meters, setMeters] = useState<Meter[]>(initialMeters)
    const [data, setData] = useState<Record<string, MeterData>>(initialData)
    useEffect(() => { setMeters(initialMeters); setData(initialData) }, [initialMeters, initialData])
    const [overviewLoadError, setOverviewLoadError] = useState(false)
    const [isFormExpanded, setIsFormExpanded] = useState(false)

    const [setupDirty, setSetupDirty] = useState(false)
    const [setupPending, setSetupPending] = useState(false)
    const [setupUnconfirmed, setSetupUnconfirmed] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)
    const protectSetup = useCallback((dirty: boolean, pending: boolean, unconfirmed: boolean) => {
        setSetupDirty(dirty)
        setSetupPending(pending)
        setSetupUnconfirmed(unconfirmed)
    }, [])
    const closeSetup = () => {
        if (setupPending) return
        if (setupDirty) setDiscardOpen(true)
        else setIsFormExpanded(false)
    }

    const supabase = createClient()

    const fetchData = async () => {
        try {
            const { data: metersData, error: metersError } = await supabase
                .from('meters')
                .select('*')
                .order('created_at', { ascending: true })
            if (metersError || !metersData) throw metersError || new Error('Keine Übersicht erhalten')
            const newData: Record<string, MeterData> = {}
            for (const meter of metersData) {
                newData[meter.id] = await loadMeterData(supabase, meter.id)
            }
            setMeters(metersData as Meter[])
            setData(newData)
            setOverviewLoadError(false)
        } catch {
            setOverviewLoadError(true)
        }
    }

    const deleteMeter = (id: string) => {
        setMeters(previous => previous.filter(meter => meter.id !== id))
        setData(previous => { const next = { ...previous }; delete next[id]; return next })
        setMessage('Der Zähler ist entfernt. Andere Zähler bleiben erhalten.')
        router.refresh()
        requestAnimationFrame(() => heading.current?.focus())
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
            <h1 ref={heading} tabIndex={-1}>Deine Zähler</h1>
            {overviewLoadError && <div className="parity-form" role="alert">
                <p>Die Übersicht konnte nicht geladen werden. Bereits gespeicherte Zähler bleiben erhalten. Lade die Übersicht erneut, bevor du einen weiteren Zähler einrichtest.</p>
                <Button type="button" variant="outline" onClick={fetchData}>Übersicht neu laden</Button>
            </div>}
            <p role="status">{message}</p>
            {meters.length === 0 && !overviewLoadError && <section className="setup-empty">
                <h2>Dein erster Zähler</h2>
                <p>Lege einen Strom- oder Gaszähler mit Zeitraum, Konditionen und Anfangsstand an. Danach kannst du weitere Stände erfassen und deinen Verbrauch verfolgen.</p>
                <p className="text-sm text-muted-foreground">Halte deinen Vertrag oder die letzte Abrechnung und einen abgelesenen Zählerstand bereit.</p>
            </section>}
            <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${meters.length > 2 ? 'lg:grid-cols-3' : ''}`}>
                {meters.map(meter => {
                    const mData = data[meter.id] || { contracts: [], ratesByContract: {}, readings: [] }

                    return (
                        <ContractCard
                            key={meter.id}
                            meter={meter}
                            meterData={mData}
                            onUpdate={saved => { setMeters(previous => previous.map(item => item.id === saved.id ? saved : item)); router.refresh() }}
                            onReadingAdded={handleReadingAdded}
                            onDelete={deleteMeter}
                        />
                    )
                })}

            </div>
            {!overviewLoadError && <div className={meters.length ? "meter-add-action" : "meter-add-empty"}>
                <Dialog open={isFormExpanded} onOpenChange={open => open ? setIsFormExpanded(true) : closeSetup()}>
                    <DialogTrigger asChild>
                        {meters.length === 0 ? <button type="button" className="add-meter">
                            <Plus className="h-8 w-8" aria-hidden="true" />
                            <strong>Zähler hinzufügen</strong>
                            <span className="text-sm">Strom oder Gas erfassen</span>
                        </button> : <Button type="button" variant="outline"><Plus aria-hidden="true" />Zähler hinzufügen</Button>}
                    </DialogTrigger>
                    <DialogContent className="meter-setup-dialog" showCloseButton={!setupPending} onEscapeKeyDown={event => { event.preventDefault(); closeSetup() }} onPointerDownOutside={event => { event.preventDefault(); closeSetup() }}>
                        <DialogHeader>
                            <DialogTitle>Zähler einrichten</DialogTitle>
                            <DialogDescription>Strom oder Gas mit Anfangsdaten in drei Schritten einrichten.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <ContractForm
                                user_id={user.id}
                                onProtectionChange={protectSetup}
                                onSuccess={() => {
                                    fetchData();
                                    setIsFormExpanded(false);
                                }}
                                onCancel={closeSetup}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>}
            <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{setupUnconfirmed ? 'Später weiterprüfen?' : 'Eingaben verwerfen?'}</DialogTitle>
                        <DialogDescription>{setupUnconfirmed
                            ? 'Wir wissen noch nicht, ob dein Zähler gespeichert wurde. Deine Angaben bleiben in diesem Browser erhalten. Öffne „Zähler hinzufügen“ erneut, um die Speicherung zu prüfen.'
                            : 'Deine bisherigen Eingaben gehen verloren. Es wurde noch kein Zähler angelegt.'}</DialogDescription>
                    </DialogHeader>
                    <div className="form-actions setup-actions">
                        <Button type="button" variant="outline" onClick={() => setDiscardOpen(false)}>{setupUnconfirmed ? 'Jetzt prüfen' : 'Weiter einrichten'}</Button>
                        <Button type="button" onClick={() => { setDiscardOpen(false); setIsFormExpanded(false); setSetupDirty(false) }}>{setupUnconfirmed ? 'Später prüfen' : 'Eingaben verwerfen'}</Button>
                    </div>
                </DialogContent>
            </Dialog>
            {process.env.NODE_ENV === "development" && <DesignPanel />}
        </main>
    )
}
