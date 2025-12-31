"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Contract, ContractPrice, ContractPayment, Reading } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2 } from "lucide-react"
import { PriceHistory, PaymentHistory } from "@/components/history-lists"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function ContractDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const supabase = createClient()
    const [contract, setContract] = useState<Contract | null>(null)
    const [prices, setPrices] = useState<ContractPrice[]>([])
    const [payments, setPayments] = useState<ContractPayment[]>([])
    const [readings, setReadings] = useState<Reading[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            if (!id) return
            const { data: c } = await supabase.from('contracts').select('*').eq('id', id).single()
            if (c) setContract(c as Contract)

            const [pRes, payRes, rRes] = await Promise.all([
                supabase.from('contract_prices').select('*').eq('contract_id', id).order('valid_from', { ascending: true }),
                supabase.from('contract_payments').select('*').eq('contract_id', id).order('valid_from', { ascending: true }),
                supabase.from('readings').select('*').eq('contract_id', id).order('date', { ascending: false }) // Desc for list
            ])

            if (pRes.data) setPrices(pRes.data as ContractPrice[])
            if (payRes.data) setPayments(payRes.data as ContractPayment[])
            if (rRes.data) setReadings(rRes.data as Reading[])

            setLoading(false)
        }
        fetch()
    }, [id])

    if (loading) return <div className="p-8">Loading...</div>
    if (!contract) return <div className="p-8">Contract not found</div>

    const handleDeleteReading = async (rid: string) => {
        const { error } = await supabase.from('readings').delete().eq('id', rid)
        if (!error) setReadings(readings.filter(r => r.id !== rid))
    }

    return (
        <div className="container mx-auto max-w-xl p-4 space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <h1 className="text-3xl font-bold">{contract.name}</h1>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="prices">Price History</TabsTrigger>
                    <TabsTrigger value="payments">Payment History</TabsTrigger>
                    <TabsTrigger value="readings">Readings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p><strong>Provider:</strong> {contract.provider || '-'}</p>
                            <p><strong>Type:</strong> {contract.type}</p>
                            <p><strong>Start Date:</strong> {contract.start_date}</p>
                            {contract.type === 'gas' && (
                                <div className="mt-4 pt-4 border-t">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Gas Conversion Factor (m³ to kWh)
                                    </label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-[120px]"
                                            defaultValue={contract.conversion_factor_m3_to_kwh ?? 10}
                                            onBlur={async (e) => {
                                                const val = parseFloat(e.target.value);
                                                if (val > 0) {
                                                    await supabase.from('contracts').update({ conversion_factor_m3_to_kwh: val }).eq('id', contract.id);
                                                    setContract({ ...contract, conversion_factor_m3_to_kwh: val });
                                                }
                                            }}
                                        />
                                        <span className="text-sm text-muted-foreground">kWh/m³</span>
                                    </div>
                                    <p className="text-[0.8rem] text-muted-foreground mt-1">
                                        Edit to adjust calculation. Automatically saved on blur.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="prices">
                    <Card>
                        <CardHeader>
                            <CardTitle>Price History</CardTitle>
                            <CardDescription>Manage rates over time. Add a new entry when prices change (e.g. January 1st).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PriceHistory contractId={contract.id} initialData={prices} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment History</CardTitle>
                            <CardDescription>Manage your monthly Abschlag over time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PaymentHistory contractId={contract.id} initialData={payments} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="readings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Readings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Value (kWh)</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {readings.map(r => (
                                            <TableRow key={r.id}>
                                                <TableCell>{r.date}</TableCell>
                                                <TableCell>{r.value}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteReading(r.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
