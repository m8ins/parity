"use client"

import { useId, useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { ChartDataPoint } from "@/lib/calculations"
import { useLocale } from "@/lib/locale"

interface ContractChartProps {
    data: ChartDataPoint[]
    unit: string
    goal?: number
    // Whether the contract is financially on track (no projected Nachzahlung).
    // Drives the actual line/area color: green when good, red when a Nachzahlung is projected.
    isGood?: boolean
    className?: string
}

export function ContractChart({ data, unit, goal, isGood, className }: ContractChartProps) {
    const locale = useLocale()
    const gradientId = useId().replaceAll(':', '')
    // Format data for display
    const formattedData = useMemo(() => {
        return data.map(point => ({
            ...point,
            formattedDate: new Date(point.date).toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
            projected: Math.round(point.projected),
            actual: point.actual !== null ? Math.round(point.actual) : null
        }))
    }, [data, locale])

    // Color reflects the financial outlook (passed in via isGood), i.e. whether a
    // Nachzahlung is projected — consistent with the card's Nachzahlung/Erstattung badge.
    const actualColor = isGood ? 'var(--sys-color-chart-actual)' : 'var(--sys-color-error)'

    const domainMax = Math.max(
        ...formattedData.flatMap(d => [d.projected, d.actual ?? 0]),
        goal ?? 0
    ) * 1.1 // Add 10% padding

    return (
        <div className={`h-[200px] w-full numeric ${className}`} role="img" aria-label="Verbrauch und Prognose im Abrechnungszeitraum. Die Werte stehen auch in der Monatstabelle.">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={actualColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={actualColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sys-color-divider)" />
                    <XAxis
                        dataKey="formattedDate"
                        stroke="var(--sys-color-text-secondary)"
                        fontSize="var(--ref-font-size-100)"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="var(--sys-color-text-secondary)"
                        fontSize="var(--ref-font-size-100)"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => Number(value).toLocaleString('de-DE')}
                        domain={[0, domainMax]}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--sys-color-surface)', borderColor: 'var(--sys-color-border)', borderRadius: 'var(--sys-radius-control)', color: 'var(--sys-color-text)' }}
                        itemStyle={{ color: 'var(--sys-color-text)' }}
                        formatter={(value, name) => {
                            const numValue = typeof value === 'number' ? value : 0
                            return [
                                `${numValue} ${unit}`,
                                name === 'projected' ? 'Prognose' : 'Verbrauch'
                            ]
                        }}
                    />
                    <Area
                        isAnimationActive={false}
                        type="monotone"
                        dataKey="projected"
                        stroke="var(--sys-color-chart-projected)"
                        strokeDasharray="5 5"
                        fill="none"
                        strokeWidth={2}
                        name="projected"
                    />
                    <Area
                        isAnimationActive={false}
                        type="monotone"
                        dataKey="actual"
                        stroke={actualColor}
                        fill={`url(#${gradientId})`}
                        strokeWidth={2}
                        name="actual"
                        connectNulls
                    />
                    {goal && (
                        <ReferenceLine
                            y={goal}
                            stroke="var(--sys-color-chart-target)"
                            strokeDasharray="3 3"
                            label={{ position: 'insideTopRight', value: 'Abschlag', fill: 'var(--sys-color-chart-target)', fontSize: 'var(--ref-font-size-100)' }}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
