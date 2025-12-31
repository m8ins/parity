"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Contract, ContractPrice, ContractPayment, Reading } from "@/lib/types"
import { calculateProjection } from "@/lib/calculations"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Trash2, Building2, Calendar, Zap, Flame, Gauge, Pencil, Check, X, Plus } from "lucide-react"
import { PriceHistory, PaymentHistory } from "@/components/history-lists"
import { ReadingDialog } from "@/components/reading-dialog"
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
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({ provider: '', start_date: '' })
    const [isRenaming, setIsRenaming] = useState(false)
    const [newName, setNewName] = useState('')

    const handleRename = async () => {
        if (!contract || !newName.trim()) return

        const { error } = await supabase
            .from('contracts')
            .update({ name: newName })
            .eq('id', contract.id)

        if (!error) {
            setContract({ ...contract, name: newName })
            setIsRenaming(false)
        }
    }

    const handleSave = async () => {
        if (!contract) return

        const { error } = await supabase
            .from('contracts')
            .update({
                provider: editForm.provider,
                start_date: editForm.start_date
            })
            .eq('id', contract.id)

        if (!error) {
            setContract({ ...contract, provider: editForm.provider, start_date: editForm.start_date })
            setIsEditing(false)
        }
    }

    const fetchData = async () => {
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

    useEffect(() => {
        fetchData()
    }, [id])

    // Calculate projection (Memoize?)
    const projection = useMemo(() => {
        if (!contract || readings.length < 2) return null
        return calculateProjection(contract, readings, prices, payments)
    }, [contract, readings, prices, payments])

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
                {isRenaming ? (
                    <div className="flex items-center gap-2">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="h-9 text-2xl font-bold w-64"
                            autoFocus
                        />
                        <Button variant="ghost" size="icon-sm" className="text-green-500 hover:text-green-600" onClick={handleRename}>
                            <Check className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-gray-500 hover:text-gray-600" onClick={() => setIsRenaming(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                ) : (
                    <h1
                        className="text-3xl font-bold cursor-pointer hover:outline hover:outline-2 hover:outline-muted-foreground/20 hover:rounded-sm px-1 -mx-1 select-none"
                        onClick={() => {
                            setNewName(contract.name)
                            setIsRenaming(true)
                        }}
                        title="Click to rename"
                    >
                        {contract.name}
                    </h1>
                )}
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
                        <CardHeader className="flex flex-row items-top justify-between space-y-0">
                            <CardTitle>Details</CardTitle>
                            {!isEditing ? (
                                <Button variant="ghost" size="icon-sm" onClick={() => {
                                    setEditForm({
                                        provider: contract.provider || '',
                                        start_date: contract.start_date || ''
                                    })
                                    setIsEditing(true)
                                }}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600" onClick={() => setIsEditing(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm" className="text-green-500 hover:text-green-600" onClick={handleSave}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <dl className="space-y-0.5">
                                <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                                    <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                                        <Building2 className="h-4 w-4" /> Provider
                                    </dt>
                                    <dd className="text-sm font-medium flex-1">
                                        {isEditing ? (
                                            <Input
                                                value={editForm.provider}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, provider: e.target.value }))}
                                                className="h-8"
                                            />
                                        ) : (
                                            contract.provider || '-'
                                        )}
                                    </dd>
                                </div>
                                <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                                    <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                                        {contract.type === 'gas' ? <Flame className="h-4 w-4" /> : <Zap className="h-4 w-4" />} Type
                                    </dt>
                                    <dd className="text-sm font-medium capitalize flex items-center gap-2">
                                        {contract.type}
                                    </dd>
                                </div>
                                <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                                    <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                                        <Calendar className="h-4 w-4" /> Start Date
                                    </dt>
                                    <dd className="text-sm font-medium flex-1">
                                        {isEditing ? (
                                            <Input
                                                type="date"
                                                value={editForm.start_date}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                                                className="h-8"
                                            />
                                        ) : (
                                            contract.start_date
                                        )}
                                    </dd>
                                </div>
                                {contract.type === 'gas' && (
                                    <div className="flex flex-row items-center py-2 hover:bg-muted/50 rounded-sm px-2 -mx-2 transition-colors h-11">
                                        <dt className="w-36 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
                                            <Gauge className="h-4 w-4" /> Conversion
                                        </dt>
                                        <dd className="text-sm font-medium flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                        </dd>
                                    </div>
                                )}
                            </dl>
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
                            <div className="flex flex-row items-center justify-between">
                                <CardTitle>Readings</CardTitle>
                                <ReadingDialog contractId={contract.id} lastReadingValue={readings[0]?.value} onSuccess={fetchData}>
                                    <Button variant="outline" size="sm">
                                        <Plus className="mr-2 h-4 w-4" /> Add Reading
                                    </Button>
                                </ReadingDialog>
                            </div>
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
        </div >
    )
}
