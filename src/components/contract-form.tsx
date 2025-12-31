"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,

    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

import { GAS_WEIGHTS, ELECTRICITY_WEIGHTS } from "@/lib/types"

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    type: z.enum(["electricity", "gas"]),
    provider: z.string().optional(),
    start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date",
    }),
    base_price_monthly: z.coerce.number().min(0),
    energy_price_cents_per_kwh: z.coerce.number().min(0),
    monthly_payment: z.coerce.number().min(0),
    monthly_distribution: z.preprocess((val) => {
        // If entirely empty/undefined, let it be optional (return undefined)
        if (!val || (Array.isArray(val) && val.every(v => v === undefined || v === null))) return undefined;

        // If it's a sparse array, we need to fill the holes with defaults
        if (Array.isArray(val)) {
            return val.map(v => v === undefined || v === null ? 0 : v);
        }
        return val;
    }, z.array(z.number()).optional().refine((val) => {
        if (!val) return true; // Optional
        const sum = val.reduce((a, b) => a + b, 0);
        // Allow small floating point error
        return Math.abs(sum - 1) < 0.001;
    }, { message: "Monthly weights must sum to 100%" })),
    conversion_factor_m3_to_kwh: z.preprocess((val) => {
        if (val === undefined || val === '') return 1;
        return Number(val);
    }, z.number().min(0.0001).default(1)),
})

export function ContractForm({ user_id, onSuccess, onCancel }: { user_id: string, onSuccess?: () => void, onCancel?: () => void }) {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            type: "electricity",
            provider: "",
            start_date: new Date().toISOString().split('T')[0],
            base_price_monthly: 0,
            energy_price_cents_per_kwh: 0,
            monthly_payment: 0,
            conversion_factor_m3_to_kwh: 1, // Default for electricity
        },
    })

    // Update conversion factor when type changes
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'type') {
                const currentFactor = form.getValues('conversion_factor_m3_to_kwh');
                if (value.type === 'gas' && currentFactor === 1) {
                    // Switching to gas, default to 10
                    form.setValue('conversion_factor_m3_to_kwh', 10);
                } else if (value.type === 'electricity' && currentFactor === 10) {
                    // Switching back to electricity, reset to 1
                    form.setValue('conversion_factor_m3_to_kwh', 1);
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            // 1. Create Contract Wrapper
            const { data: contract, error: contractError } = await supabase.from("contracts").insert({
                user_id,
                name: values.name,
                type: values.type,
                provider: values.provider,
                start_date: values.start_date,
                monthly_distribution: values.type === 'gas' ? GAS_WEIGHTS : values.monthly_distribution,
                conversion_factor_m3_to_kwh: values.type === 'gas' ? (values.conversion_factor_m3_to_kwh || 10) : 1,
            }).select().single()

            if (contractError) throw contractError
            if (!contract) throw new Error("No contract returned")

            // 2. Insert Initial Price
            const { error: priceError } = await supabase.from("contract_prices").insert({
                contract_id: contract.id,
                valid_from: values.start_date,
                base_price_monthly: values.base_price_monthly,
                energy_price_cents_per_kwh: values.energy_price_cents_per_kwh,
            })
            if (priceError) throw priceError

            // 3. Insert Initial Payment
            const { error: paymentError } = await supabase.from("contract_payments").insert({
                contract_id: contract.id,
                valid_from: values.start_date,
                monthly_payment: values.monthly_payment,
            })
            if (paymentError) throw paymentError

            form.reset()
            router.refresh()
            if (onSuccess) onSuccess()
        } catch (e) {
            console.error(e)
            alert("Error saving contract")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error(errors))} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Home Electricity" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-center gap-2">
                    <FormField
                        control={form.control}
                        name="type"

                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>Type</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="electricity">Electricity</SelectItem>
                                            <SelectItem value="gas">Gas</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {form.watch("type") === "gas" && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <Info />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80" side="right" align="start">
                                                <div className="space-y-4">
                                                    <h4 className="font-medium leading-none">Gas Usage Calculation</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Gas usage isn't linear. We use a standard load profile (Standardlastprofil) to estimate higher consumption in winter months.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Table>
                                                            <TableBody>
                                                                {Array.from({ length: 6 }).map((_, i) => {
                                                                    const monthName = new Date(0, i).toLocaleString('default', { month: 'short' });
                                                                    return (
                                                                        <TableRow key={i} className="h-6">
                                                                            <TableCell className="py-0.5 text-xs">{monthName}</TableCell>
                                                                            <TableCell className="py-0.5 text-xs text-right">{(GAS_WEIGHTS[i] * 100).toFixed(0)}%</TableCell>
                                                                        </TableRow>
                                                                    )
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                        <Table>
                                                            <TableBody>
                                                                {Array.from({ length: 6 }).map((_, i) => {
                                                                    const idx = i + 6;
                                                                    const monthName = new Date(0, idx).toLocaleString('default', { month: 'short' });
                                                                    return (
                                                                        <TableRow key={idx} className="h-6">
                                                                            <TableCell className="py-0.5 text-xs">{monthName}</TableCell>
                                                                            <TableCell className="py-0.5 text-xs text-right">{(GAS_WEIGHTS[idx] * 100).toFixed(0)}%</TableCell>
                                                                        </TableRow>
                                                                    )
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="provider"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Provider</FormLabel>
                                <FormControl>
                                    <Input placeholder="E.ON" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="base_price_monthly"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Base Price (€/mo)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="energy_price_cents_per_kwh"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price (Cent/kWh)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="monthly_payment"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monthly Payment (Abschlag €)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {form.watch("type") === "gas" && (
                    <FormField
                        control={form.control}
                        name="conversion_factor_m3_to_kwh"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gas Conversion Factor (m³ to kWh)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => {
                                            field.onChange(e);
                                        }}
                                    />
                                </FormControl>
                                <FormDescription>Standard is ~10. Check your bill.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <div className="flex gap-2">
                    {onCancel && (
                        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? "Saving..." : "Create Contract"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
