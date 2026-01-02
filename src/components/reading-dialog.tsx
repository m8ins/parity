"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
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
import { useRouter } from "next/navigation"

const formSchema = z.object({
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date",
    }).refine((val) => {
        // Create local date string for today to compare with input (which is YYYY-MM-DD)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Lexicographical comparison works for YYYY-MM-DD
        return val <= todayStr;
    }, {
        message: "Date cannot be in the future",
    }),
    value: z.coerce.number().min(0),
})

export function ReadingDialog({ contractId, lastReadingValue, children, onSuccess }: { contractId: string, lastReadingValue?: number, children: React.ReactNode, onSuccess?: () => void }) {
    const [open, setOpen] = useState(false)
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            value: lastReadingValue ?? 0,
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                date: new Date().toISOString().split('T')[0],
                value: lastReadingValue ?? 0
            })
        }
    }, [open, lastReadingValue, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const { error } = await supabase.from("readings").insert({
                contract_id: contractId,
                date: values.date,
                value: values.value,
            })

            if (error) {
                console.error(error)
                alert("Error saving reading")
                return
            }

            form.reset()
            setOpen(false)
            router.refresh()
            if (onSuccess) onSuccess()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Reading</DialogTitle>
                    <DialogDescription>
                        Enter the meter reading value and date.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reading Value</FormLabel>
                                    <InputGroup>
                                        <FormControl>
                                            <InputGroupInput type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <InputGroupAddon align="inline-end">
                                            <InputGroupText>kWh</InputGroupText>
                                        </InputGroupAddon>
                                    </InputGroup>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Saving..." : "Save Reading"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
