"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import type { Resolver } from "react-hook-form"
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
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    InputGroupInput,
} from "@/components/ui/input-group"
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
    TableRow,
} from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { useLocale } from "@/lib/locale"
import { GAS_WEIGHTS } from "@/lib/types"

const formSchema = z.object({
    name: z.string().min(2, { message: "Bitte einen Namen mit mindestens 2 Zeichen eingeben." }),
    type: z.enum(["electricity", "gas"]),
    provider: z.string().optional(),
    period_start: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Bitte ein gültiges Datum eingeben." }),
    grundpreis: z.coerce.number({ error: "Bitte eine gültige Zahl eingeben." }).min(0, { message: "Bitte einen Wert ab 0 eingeben." }),
    arbeitspreis: z.coerce.number({ error: "Bitte eine gültige Zahl eingeben." }).min(0, { message: "Bitte einen Wert ab 0 eingeben." }),
    abschlag: z.coerce.number({ error: "Bitte eine gültige Zahl eingeben." }).min(0, { message: "Bitte einen Wert ab 0 eingeben." }),
    umrechnungsfaktor: z.coerce.number({ error: "Bitte eine gültige Zahl eingeben." }).min(0.0001, { message: "Der Umrechnungsfaktor muss größer als 0 sein." }),
})

export function ContractForm({ user_id, onSuccess, onCancel }: { user_id: string, onSuccess?: () => void, onCancel?: () => void }) {
    const supabase = createClient()
    const router = useRouter()
    const locale = useLocale()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    type FormValues = z.infer<typeof formSchema>
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: {
            name: "",
            type: "electricity",
            provider: "",
            period_start: new Date().toISOString().split('T')[0],
            grundpreis: 0,
            arbeitspreis: 0,
            abschlag: 0,
            umrechnungsfaktor: 1,
        },
    })

    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'type') {
                const currentFactor = form.getValues('umrechnungsfaktor');
                if (value.type === 'gas' && currentFactor === 1) {
                    form.setValue('umrechnungsfaktor', 10);
                } else if (value.type === 'electricity' && currentFactor === 10) {
                    form.setValue('umrechnungsfaktor', 1);
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        setError("")
        try {
            // 1. Create Meter
            const { data: meter, error: meterError } = await supabase.from("meters").insert({
                user_id,
                name: values.name,
                type: values.type,
                monthly_distribution: values.type === 'gas'
                    ? GAS_WEIGHTS
                    : Array(12).fill(1 / 12),
            }).select().single()

            if (meterError) throw meterError
            if (!meter) throw new Error("No meter returned")

            // 2. Create Contract (billing period)
            const { data: contract, error: contractError } = await supabase.from("contracts").insert({
                meter_id: meter.id,
                period_start: values.period_start,
                provider: values.provider?.trim() || null,
            }).select().single()

            if (contractError) throw contractError
            if (!contract) throw new Error("No contract returned")

            // 3. Create initial Rate
            const { error: rateError } = await supabase.from("rates").insert({
                contract_id: contract.id,
                effective_from: values.period_start,
                grundpreis: values.grundpreis,
                arbeitspreis: values.arbeitspreis,
                abschlag: values.abschlag,
                umrechnungsfaktor: values.type === 'gas' ? values.umrechnungsfaktor : 1,
            })
            if (rateError) throw rateError

            form.reset()
            router.refresh()
            if (onSuccess) onSuccess()
        } catch {
            setError("Der Zähler konnte nicht vollständig angelegt werden. Bitte prüfe die Übersicht vor einem erneuten Versuch, damit kein doppelter Zähler entsteht.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error(errors))} className="parity-form" aria-busy={loading}>
                <fieldset disabled={loading}>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Hauptzähler Strom" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Anbieter (optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="z. B. e.on, Vattenfall" {...field} />
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
                                <FormLabel>Zählertyp</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Zählertyp wählen" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="electricity">Strom</SelectItem>
                                            <SelectItem value="gas">Gas</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {form.watch("type") === "gas" && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button type="button" variant="ghost" size="icon" aria-label="Saisonale Gasverteilung erklären">
                                                    <Info />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80" side="right" align="start">
                                                <div className="space-y-4">
                                                    <h4 className="font-medium leading-none">Saisonale Gasverteilung</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Gas-Verbrauch ist nicht linear. Wir verwenden ein Standard-Lastprofil (H0) mit höherem Verbrauch in Wintermonaten.
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <Table>
                                                            <TableBody>
                                                                {Array.from({ length: 6 }).map((_, i) => {
                                                                    const monthName = new Date(0, i).toLocaleString(locale, { month: 'short' });
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
                                                                    const monthName = new Date(0, idx).toLocaleString(locale, { month: 'short' });
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

                <FormField
                    control={form.control}
                    name="period_start"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Beginn des Abrechnungszeitraums</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="grundpreis"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Grundpreis</FormLabel>
                                <InputGroup>
                                    <FormControl>
                                        <InputGroupInput type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupText>€/Monat</InputGroupText>
                                    </InputGroupAddon>
                                </InputGroup>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="arbeitspreis"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Arbeitspreis</FormLabel>
                                <InputGroup>
                                    <FormControl>
                                        <InputGroupInput type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupText>ct/kWh</InputGroupText>
                                    </InputGroupAddon>
                                </InputGroup>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="abschlag"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Abschlag</FormLabel>
                            <InputGroup>
                                <FormControl>
                                    <InputGroupInput type="number" step="0.01" {...field} />
                                </FormControl>
                                <InputGroupAddon align="inline-end">
                                    <InputGroupText>€/Monat</InputGroupText>
                                </InputGroupAddon>
                            </InputGroup>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {form.watch("type") === "gas" && (
                    <FormField
                        control={form.control}
                        name="umrechnungsfaktor"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Umrechnungsfaktor</FormLabel>
                                <InputGroup>
                                    <FormControl>
                                        <InputGroupInput type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupText>kWh/m³</InputGroupText>
                                    </InputGroupAddon>
                                </InputGroup>
                                <FormDescription>Standard ~10. Auf der Jahresabrechnung angegeben.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="form-actions flex flex-wrap gap-2">
                    {onCancel && (
                        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                            Abbrechen
                        </Button>
                    )}
                    <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? "Wird gespeichert…" : "Zähler anlegen"}
                    </Button>
                </div>
                </fieldset>
            </form>
        </Form>
    )
}
