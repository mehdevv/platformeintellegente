import React, { useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

const COLORS = ['#197F94', '#4B5B72', '#5ED4E4', '#2d6a4f', '#bc6c25', '#7b2cbf']

/**
 * @param {string} raw
 */
export function parseChartSpec(raw) {
    try {
        const spec = JSON.parse(raw.trim())
        if (!spec || typeof spec !== 'object') return null
        const type = String(spec.type || 'bar').toLowerCase()
        if (!['bar', 'line', 'pie'].includes(type)) return null
        const labels = Array.isArray(spec.labels) ? spec.labels.map(String) : []
        const datasets = Array.isArray(spec.datasets) ? spec.datasets : []
        if (!labels.length || !datasets.length) return null
        const primary = datasets[0]
        const data = Array.isArray(primary?.data) ? primary.data.map(Number) : []
        if (data.length !== labels.length || data.some(n => Number.isNaN(n))) return null
        return {
            type,
            title: spec.title || '',
            labels,
            datasets: datasets.map((ds, i) => ({
                label: ds.label || `Series ${i + 1}`,
                data: Array.isArray(ds.data) ? ds.data.map(Number) : [],
            })),
        }
    } catch {
        return null
    }
}

function buildChartRows(spec) {
    const keys = spec.datasets.map((ds, i) => ds.label || `series${i}`)
    return spec.labels.map((label, idx) => {
        const row = { name: label }
        spec.datasets.forEach((ds, di) => {
            row[keys[di]] = ds.data[idx] ?? 0
        })
        return row
    })
}

export default function AIChartBlock({ spec }) {
    const parsed = useMemo(() => (typeof spec === 'string' ? parseChartSpec(spec) : spec), [spec])
    const keys = parsed?.datasets.map((ds, i) => ds.label || `series${i}`) || []
    const rows = parsed ? buildChartRows(parsed) : []

    if (!parsed) {
        return (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                Invalid chart data
            </Typography>
        )
    }

    return (
        <Box sx={{ my: 2, width: '100%', minHeight: 260 }}>
            {parsed.title && (
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    {parsed.title}
                </Typography>
            )}
            <ResponsiveContainer width="100%" height={260}>
                {parsed.type === 'line' ? (
                    <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        {keys.map((key, i) => (
                            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                        ))}
                    </LineChart>
                ) : parsed.type === 'pie' ? (
                    <PieChart>
                        <Pie data={rows} dataKey={keys[0]} nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                            {rows.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                ) : (
                    <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        {keys.map((key, i) => (
                            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                )}
            </ResponsiveContainer>
        </Box>
    )
}
