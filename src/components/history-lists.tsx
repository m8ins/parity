"use client"

import { formatDate } from "@/lib/date-utils"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ContractPrice, ContractPayment } from "@/lib/types"
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

export function PriceHistory({ contractId, initialData }: { contractId: string, initialData: ContractPrice[] }) {
    const [prices, setPrices] = useState(initialData)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    // Simple Add Form State
    const [date, setDate] = useState("")
    const [basePrice, setBasePrice] = useState("")
    const [energyPrice, setEnergyPrice] = useState("")

    const handleAdd = async () => {
        if (!date || !basePrice || !energyPrice) return
        setLoading(true)
        const { data, error } = await supabase.from('contract_prices').insert({
            contract_id: contractId,
            valid_from: date,
            base_price_monthly: parseFloat(basePrice),
            energy_price_cents_per_kwh: parseFloat(energyPrice)
        }).select().single()

        if (data) {
            setPrices([...prices, data].sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime()))
            setDate("")
            setBasePrice("")
            setEnergyPrice("")
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        // Prevent deleting the last remaining price if strictly needed, but let's allow flexibility
        const { error } = await supabase.from('contract_prices').delete().eq('id', id)
        if (!error) {
            setPrices(prices.filter(p => p.id !== id))
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-end border p-4 rounded-md bg-zinc-50 dark:bg-zinc-900">
                <div className="space-y-1">
                    <Label>Valid From</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-1 w-24">
                    <Label>Base (€)</Label>
                    <Input type="number" step="0.01" value={basePrice} onChange={e => setBasePrice(e.target.value)} />
                </div>
                <div className="space-y-1 w-24">
                    <Label>Ct/kWh</Label>
                    <Input type="number" step="0.01" value={energyPrice} onChange={e => setEnergyPrice(e.target.value)} />
                </div>
                <Button onClick={handleAdd} disabled={loading}>Add Price</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Valid From</TableHead>
                        <TableHead>Base Price</TableHead>
                        <TableHead>Energy Price</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {prices.map((price) => (
                        <TableRow key={price.id}>
                            <TableCell>{formatDate(price.valid_from)}</TableCell>
                            <TableCell>{price.base_price_monthly.toFixed(2)} €</TableCell>
                            <TableCell>{price.energy_price_cents_per_kwh.toFixed(2)} ct</TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(price.id)}>
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

export function PaymentHistory({ contractId, initialData }: { contractId: string, initialData: ContractPayment[] }) {
    const [payments, setPayments] = useState(initialData)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    // Simple Add Form State
    const [date, setDate] = useState("")
    const [amount, setAmount] = useState("")

    const handleAdd = async () => {
        if (!date || !amount) return
        setLoading(true)
        const { data, error } = await supabase.from('contract_payments').insert({
            contract_id: contractId,
            valid_from: date,
            monthly_payment: parseFloat(amount)
        }).select().single()

        if (data) {
            setPayments([...payments, data].sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime()))
            setDate("")
            setAmount("")
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('contract_payments').delete().eq('id', id)
        if (!error) {
            setPayments(payments.filter(p => p.id !== id))
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-end border p-4 rounded-md bg-zinc-50 dark:bg-zinc-900">
                <div className="space-y-1">
                    <Label>Valid From</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-1 w-32">
                    <Label>Payment (€)</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <Button onClick={handleAdd} disabled={loading}>Add Change</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Valid From</TableHead>
                        <TableHead>Monthly Payment</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.valid_from)}</TableCell>
                            <TableCell>{payment.monthly_payment.toFixed(2)} €</TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(payment.id)}>
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
