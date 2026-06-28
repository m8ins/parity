"use client"

import { formatDate } from "@/lib/date-utils"
import { useLocale } from "@/lib/locale"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Rate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Trash2 } from "lucide-react"

export function RateHistory({ contractId, initialData, isGas }: { contractId: string, initialData: Rate[], isGas: boolean }) {
    const [rates, setRates] = useState(initialData)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const locale = useLocale()

    const [date, setDate] = useState("")
    const [grundpreis, setGrundpreis] = useState("")
    const [arbeitspreis, setArbeitspreis] = useState("")
    const [abschlag, setAbschlag] = useState("")
    const [umrechnungsfaktor, setUmrechnungsfaktor] = useState(isGas ? "10" : "1")

    const handleAdd = async () => {
        if (!date || !grundpreis || !arbeitspreis || !abschlag) return
        setLoading(true)
        const { data, error } = await supabase.from('rates').insert({
            contract_id: contractId,
            effective_from: date,
            grundpreis: parseFloat(grundpreis),
            arbeitspreis: parseFloat(arbeitspreis),
            abschlag: parseFloat(abschlag),
            umrechnungsfaktor: isGas ? parseFloat(umrechnungsfaktor) : 1,
        }).select().single()

        if (!error && data) {
            setRates([...rates, data as Rate].sort((a, b) =>
                new Date(a.effective_from).getTime() - new Date(b.effective_from).getTime()
            ))
            setDate("")
            setGrundpreis("")
            setArbeitspreis("")
            setAbschlag("")
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('rates').delete().eq('id', id)
        if (!error) setRates(rates.filter(r => r.id !== id))
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-end border p-4 rounded-md bg-zinc-50 dark:bg-zinc-900">
                <div className="space-y-1">
                    <Label>Ab Datum</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-1 w-24">
                    <Label>Grundpreis (€)</Label>
                    <Input type="number" step="0.01" value={grundpreis} onChange={e => setGrundpreis(e.target.value)} />
                </div>
                <div className="space-y-1 w-24">
                    <Label>Arbeitspreis (ct)</Label>
                    <Input type="number" step="0.01" value={arbeitspreis} onChange={e => setArbeitspreis(e.target.value)} />
                </div>
                <div className="space-y-1 w-24">
                    <Label>Abschlag (€)</Label>
                    <Input type="number" step="0.01" value={abschlag} onChange={e => setAbschlag(e.target.value)} />
                </div>
                {isGas && (
                    <div className="space-y-1 w-24">
                        <Label>Faktor</Label>
                        <Input type="number" step="0.01" value={umrechnungsfaktor} onChange={e => setUmrechnungsfaktor(e.target.value)} />
                    </div>
                )}
                <Button onClick={handleAdd} disabled={loading}>Hinzufügen</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Ab</TableHead>
                        <TableHead>Grundpreis</TableHead>
                        <TableHead>Arbeitspreis</TableHead>
                        <TableHead>Abschlag</TableHead>
                        {isGas && <TableHead>Faktor</TableHead>}
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rates.map((rate) => (
                        <TableRow key={rate.id}>
                            <TableCell>{formatDate(rate.effective_from, locale)}</TableCell>
                            <TableCell>{rate.grundpreis.toFixed(2)} €</TableCell>
                            <TableCell>{rate.arbeitspreis.toFixed(2)} ct</TableCell>
                            <TableCell>{rate.abschlag.toFixed(2)} €</TableCell>
                            {isGas && <TableCell>{rate.umrechnungsfaktor}</TableCell>}
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(rate.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
