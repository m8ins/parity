"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { ChartDataPoint } from "@/lib/calculations"
import { useLocale } from "@/lib/locale"

interface ContractChartProps {
    data: ChartDataPoint[]
    unit: string
    goal?: number
    className?: string
}

export function ContractChart({ data, unit, goal, className }: ContractChartProps) {
    const locale = useLocale()
    // Format data for display
    const formattedData = useMemo(() => {
        return data.map(point => ({
            ...point,
            formattedDate: new Date(point.date).toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
            projected: Math.round(point.projected),
            actual: point.actual !== null ? Math.round(point.actual) : null
        }))
    }, [data, locale])

    // Determine color based on latest actual vs projected
    // If actual < projected -> Good (Green)
    // If actual > projected -> Bad (Red/Orange)
    // We look at the last point that has actual data
    const lastActualPoint = [...data].reverse().find(p => p.actual !== null)
    const isGood = lastActualPoint ? (lastActualPoint.actual! <= lastActualPoint.projected) : true

    const actualColor = isGood ? "oklch(0.696 0.17 142.5)" : "oklch(0.627 0.258 29.234)" // green-500 : red-500
    // Use CSS variables for better theme support if possible, but hex is safe for recharts

    const domainMax = Math.max(
        ...formattedData.flatMap(d => [d.projected, d.actual ?? 0]),
        goal ?? 0
    ) * 1.1 // Add 10% padding

    return (
        <div className={`h-[200px] w-full ${className}`}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={actualColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={actualColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.588 0 0)" opacity={0.2} />
                    <XAxis
                        dataKey="formattedDate"
                        stroke="oklch(0.588 0 0)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="oklch(0.588 0 0)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                        domain={[0, domainMax]}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'oklch(1 0 0)', borderColor: 'oklch(0.922 0.004 264.542)', borderRadius: '6px', color: 'oklch(0 0 0)' }}
                        itemStyle={{ color: 'oklch(0 0 0)' }}
                        formatter={(value, name) => {
                            const numValue = typeof value === 'number' ? value : 0
                            return [
                                `${numValue} ${unit}`,
                                name === 'projected' ? 'Projected' : 'Actual'
                            ]
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="projected"
                        stroke="oklch(0.682 0.017 251.165)"
                        strokeDasharray="5 5"
                        fill="none"
                        strokeWidth={2}
                        name="projected"
                    />
                    <Area
                        type="monotone"
                        dataKey="actual"
                        stroke={actualColor}
                        fill="url(#colorActual)"
                        strokeWidth={2}
                        name="actual"
                        connectNulls
                    />
                    {goal && (
                        <ReferenceLine
                            y={goal}
                            stroke="oklch(0.623 0.214 163.725)" // Green-ish 
                            strokeDasharray="3 3"
                            label={{ position: 'right', value: 'Goal', fill: 'oklch(0.623 0.214 163.725)', fontSize: 12 }}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
