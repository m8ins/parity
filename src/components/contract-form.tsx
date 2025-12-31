"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
                monthly_distribution: values.monthly_distribution,
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
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Add Contract</CardTitle>
                <CardDescription>Enter your contract details.</CardDescription>
            </CardHeader>
            <CardContent>
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

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="electricity">Electricity</SelectItem>
                                            <SelectItem value="gas">Gas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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

                        <details className="group mb-4">
                            <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-900 mb-2 select-none">
                                Advanced Options (Monthly Weighting)
                            </summary>
                            <div className="p-4 border rounded-md space-y-4 bg-gray-50/50 mt-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-gray-500">
                                        Customize how consumption is distributed across the year (in %).
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const type = form.getValues("type");
                                            const weights = type === "gas" ? GAS_WEIGHTS : ELECTRICITY_WEIGHTS;
                                            form.setValue("monthly_distribution", weights);
                                        }}
                                    >
                                        Reset to Standard
                                    </Button>
                                </div>

                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const monthName = new Date(0, i).toLocaleString('default', { month: 'short' });
                                        // Determine effective value for display
                                        const currentVal = form.watch(`monthly_distribution.${i}`);
                                        const type = form.watch("type");
                                        const defaults = type === "gas" ? GAS_WEIGHTS : ELECTRICITY_WEIGHTS;
                                        const effectiveVal = currentVal !== undefined ? currentVal : defaults[i];

                                        return (
                                            <FormField
                                                key={i}
                                                control={form.control}
                                                name={`monthly_distribution.${i}`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">{monthName}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.1"
                                                                className="h-8 text-xs"
                                                                value={(Number(effectiveVal) * 100).toFixed(1)}
                                                                onChange={(e) => {
                                                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                                    if (!isNaN(val)) {
                                                                        // Initialize with defaults if undefined
                                                                        const currentDist = (form.getValues("monthly_distribution") as number[] | undefined) || defaults;
                                                                        const newDist = [...currentDist];
                                                                        newDist[i] = val / 100;
                                                                        form.setValue("monthly_distribution", newDist);
                                                                    }
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    Total: {(
                                        Array.from({ length: 12 }).reduce((acc: number, _, i) => {
                                            const dist = form.watch("monthly_distribution");
                                            const type = form.watch("type");
                                            const defaults = type === "gas" ? GAS_WEIGHTS : ELECTRICITY_WEIGHTS;
                                            const val = (dist && dist[i] !== undefined) ? dist[i] : defaults[i];
                                            return acc + (Number(val) || 0);
                                        }, 0) * 100
                                    ).toFixed(1)}%
                                </div>
                                {/* Use "as any" to bypass strict typing on array errors which can be tricky */}
                                {form.formState.errors.monthly_distribution && (
                                    <p className="text-sm font-medium text-destructive text-right mt-1">
                                        {(form.formState.errors.monthly_distribution as any).message || (form.formState.errors.monthly_distribution as any).root?.message}
                                    </p>
                                )}
                            </div>
                        </details>

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
            </CardContent>
        </Card>
    )
}
