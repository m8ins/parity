"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartDataPoint } from "@/lib/calculations"

interface ContractChartProps {
    data: ChartDataPoint[]
    unit: string
    className?: string
}

export function ContractChart({ data, unit, className }: ContractChartProps) {
    // Format data for display
    const formattedData = useMemo(() => {
        return data.map(point => ({
            ...point,
            formattedDate: new Date(point.date).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
            projected: Math.round(point.projected),
            actual: point.actual !== null ? Math.round(point.actual) : null
        }))
    }, [data])

    // Determine color based on latest actual vs projected
    // If actual < projected -> Good (Green)
    // If actual > projected -> Bad (Red/Orange)
    // We look at the last point that has actual data
    const lastActualPoint = [...data].reverse().find(p => p.actual !== null)
    const isGood = lastActualPoint ? (lastActualPoint.actual! <= lastActualPoint.projected) : true

    const actualColor = isGood ? "#22c55e" : "#ef4444" // green-500 : red-500
    // Use CSS variables for better theme support if possible, but hex is safe for recharts

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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.2} />
                    <XAxis
                        dataKey="formattedDate"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'white', borderColor: '#e2e8f0', borderRadius: '6px', color: 'black' }}
                        itemStyle={{ color: 'black' }}
                        formatter={(value: number, name: string) => [
                            `${value} ${unit}`,
                            name === 'projected' ? 'Projected' : 'Actual'
                        ]}
                    />
                    <Area
                        type="monotone"
                        dataKey="projected"
                        stroke="#94a3b8"
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
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
