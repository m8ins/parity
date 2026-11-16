"use client"

import { useId, useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { ChartDataPoint } from "@/lib/calculations"

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
    const gradientId = useId().replaceAll(':', '')
    const monthTicks = useMemo(() => data.filter((point, index) => index === 0 ||
        point.date.slice(0, 7) !== data[index - 1].date.slice(0, 7)).map(point => point.date), [data])

    // Color reflects the financial outlook (passed in via isGood), i.e. whether a
    // Nachzahlung is projected — consistent with the card's Nachzahlung/Erstattung badge.
    const actualColor = isGood ? 'var(--sys-color-chart-actual)' : 'var(--sys-color-error)'

    const domainMax = Math.max(
        ...data.flatMap(d => [d.projected, d.actual ?? 0]),
        goal ?? 0
    ) * 1.1 || 1 // Keep a readable axis for explicitly zero consumption

    return (
        <div className={`understand-chart-scroll numeric ${className ?? ''}`} tabIndex={0} role="img" aria-label="Hochrechnung und aus Ablesungen abgeleiteter Verbrauch im Abrechnungszeitraum. Zusammenfassung und Monatswerte stehen im Text.">
            <div className="understand-chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 56, right: 112, left: 8, bottom: 32 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={actualColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={actualColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sys-color-divider)" />
                    <XAxis
                        dataKey="date"
                        ticks={monthTicks}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('de-DE', { month: 'long', timeZone: 'UTC' })}
                        stroke="var(--sys-color-text-secondary)"
                        fontSize="var(--ref-font-size-100)"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={80}
                    />
                    <YAxis
                        width="auto"
                        label={{ value: unit, position: 'top', offset: 16, fill: 'var(--sys-color-text-secondary)', fontSize: 'var(--ref-font-size-100)' }}
                        stroke="var(--sys-color-text-secondary)"
                        fontSize="var(--ref-font-size-100)"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => Number(value).toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                        domain={[0, domainMax]}
                    />
                    <Tooltip
                        labelFormatter={value => new Date(String(value)).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                        contentStyle={{ backgroundColor: 'var(--sys-color-surface)', borderColor: 'var(--sys-color-border)', borderRadius: 'var(--sys-radius-control)', color: 'var(--sys-color-text)' }}
                        itemStyle={{ color: 'var(--sys-color-text)' }}
                        formatter={(value, name) => {
                            const numValue = typeof value === 'number' ? value.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '—'
                            return [
                                `${numValue} ${unit}`,
                                name === 'projected' ? 'Hochrechnung' : 'Aus Ablesungen abgeleitet'
                            ]
                        }}
                    />
                    <Area
                        isAnimationActive={false}
                        type="linear"
                        dataKey="projected"
                        stroke="var(--sys-color-chart-projected)"
                        strokeDasharray="5 5"
                        fill="none"
                        strokeWidth={2}
                        name="projected"
                    />
                    <Area
                        isAnimationActive={false}
                        type="linear"
                        dataKey="actual"
                        stroke={actualColor}
                        fill={`url(#${gradientId})`}
                        strokeWidth={2}
                        name="actual"
                        connectNulls={false}
                    />
                    {goal !== undefined && (
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
        </div>
    )
}
