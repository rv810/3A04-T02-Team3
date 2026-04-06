/**
 * Public environmental dashboard.
 *
 * Subsystem: Consumes Telemetry Data Management and Alert Rules Management subsystems
 * PAC Layer: Presentation
 * Reqs:      BE4, BE5
 */

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { Wind, Thermometer, Droplets, MapPin } from 'lucide-react'
import { getAllZones, getMetricsHistory, getFiveMinAvg, getHourlyMax } from '@/lib/api'
import type { ZoneSummary, MetricsHistoryPoint, FiveMinAvgResponse, ZoneMetrics } from '@/lib/types'
import EnvironmentalChatbot from '@/components/EnvironmentalChatbot'

type Metric = 'temperature' | 'humidity' | 'oxygen'

/** Convert a UTC "HH:00" hour string to the user's local timezone equivalent. */
function utcHourToLocal(utcHour: string): string {
  const hour = parseInt(utcHour.split(':')[0], 10)
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour))
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

const METRIC_META = [
  { key: 'temperature' as Metric, label: 'Temperature', unit: '°C', icon: Thermometer, color: 'text-orange-400', bg: 'bg-orange-400/10', stroke: '#F97316', yUnit: '°C' },
  { key: 'humidity'    as Metric, label: 'Humidity',    unit: '%',  icon: Droplets,    color: 'text-cyan-400',   bg: 'bg-cyan-400/10',  stroke: '#06B6D4', yUnit: '%'  },
  { key: 'oxygen'      as Metric, label: 'Oxygen',      unit: '%',  icon: Wind,        color: 'text-green-400',  bg: 'bg-green-400/10', stroke: '#22C55E', yUnit: '%'  },
]

function getStatusLabel(metric: Metric, value: number): string {
  if (metric === 'temperature') return value >= 15 && value <= 30 ? 'Normal' : 'Extreme'
  if (metric === 'humidity')    return value >= 30 && value <= 70 ? 'Normal' : 'Abnormal'
  return value >= 19 && value <= 22 ? 'Normal' : 'Low'
}

export default function PublicDashboard() {
  const [metric, setMetric] = useState<Metric>('temperature')
  const [clock, setClock] = useState('')
  const [zones, setZones] = useState<ZoneSummary[]>([])
  const [history, setHistory] = useState<MetricsHistoryPoint[]>([])
  const [fiveMinAvg, setFiveMinAvg] = useState<FiveMinAvgResponse | null>(null)
  const [hourlyMax, setHourlyMax] = useState<ZoneMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleString('en-CA', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function fetchData() {
      try {
        const [z, h, avg, hmax] = await Promise.all([
          getAllZones(), getMetricsHistory(), getFiveMinAvg(), getHourlyMax(),
        ])
        if (!cancelled) {
          setZones(z)
          setHistory(h.map(p => ({ ...p, time: utcHourToLocal(p.time) })))
          setFiveMinAvg(avg)
          setHourlyMax(hmax)
        }
      } catch (err) {
        console.error('Failed to fetch public data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData().then(() => {
      if (!cancelled) {
        // 5-min averages don't change fast — 30 s polling is sufficient.
        intervalId = setInterval(async () => {
          try {
            const [z, avg, hmax] = await Promise.all([
              getAllZones(), getFiveMinAvg(), getHourlyMax(),
            ])
            if (!cancelled) {
              setZones(z)
              setFiveMinAvg(avg)
              setHourlyMax(hmax)
            }
          } catch { /* silent re-fetch failure */ }
        }, 30_000)
      }
    })

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const cityAvg: Record<Metric, number | null> = {
    temperature: fiveMinAvg?.city.temperature ?? null,
    humidity:    fiveMinAvg?.city.humidity ?? null,
    oxygen:      fiveMinAvg?.city.oxygen ?? null,
  }

  const metricStatus: Record<Metric, string> = {
    temperature: cityAvg.temperature != null ? getStatusLabel('temperature', cityAvg.temperature) : '—',
    humidity:    cityAvg.humidity    != null ? getStatusLabel('humidity',    cityAvg.humidity)    : '—',
    oxygen:      cityAvg.oxygen      != null ? getStatusLabel('oxygen',      cityAvg.oxygen)      : '—',
  }

  const statusGood = (m: Metric) => metricStatus[m] === 'Normal'
  const selected = METRIC_META.find(m => m.key === metric)!

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Wind className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold leading-tight">SCEMAS</div>
              <div className="text-[10px] text-gray-500">Smart City Environmental Monitoring</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600 hidden sm:block tabular-nums">{clock}</span>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
              Live
            </div>
            <Link
              href="/login"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Public · 5-minute average environmental data</p>
          <h1 className="text-2xl font-bold">City Environmental Status</h1>
          <p className="text-sm text-gray-400 mt-1">
            5-minute averages from {zones.length} monitored zone{zones.length !== 1 ? 's' : ''} · Updated every 30 s
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-3">
          {METRIC_META.map(m => {
            const Icon = m.icon
            const v = cityAvg[m.key]
            const good = statusGood(m.key)
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  metric === m.key
                    ? 'border-blue-500 bg-gray-800 shadow-lg shadow-blue-500/5'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {v != null ? v : '—'}
                  <span className="text-xs font-normal text-gray-500 ml-1">{m.unit}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{m.label} (5-min avg)</div>
                <div className={`text-xs mt-2 font-medium ${good ? 'text-green-400' : 'text-yellow-400'}`}>
                  {metricStatus[m.key]}
                </div>
              </button>
            )
          })}
        </div>

        {/* 24-Hour Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">24-Hour Trend — {selected.label}</h2>
            <span className="text-xs text-gray-600">Last 24 hours</span>
          </div>
          <div className="h-52">
            {loading ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">Loading...</div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="time" stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280' }} interval={3} />
                  <YAxis stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280' }} unit={` ${selected.yUnit}`} width={52} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB', fontSize: 12 }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Line type="monotone" dataKey={metric} stroke={selected.stroke} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Zone Status */}
        <div>
          <h2 className="font-semibold text-sm mb-3">Zone Status</h2>
          <div className="grid grid-cols-3 gap-3">
            {loading ? (
              <div className="col-span-3 text-center text-sm text-gray-500 py-8">Loading zones...</div>
            ) : zones.length === 0 ? (
              <div className="col-span-3 text-center text-sm text-gray-500 py-8">No zone data available</div>
            ) : (
              zones.map(z => {
                const zoneAvg = fiveMinAvg?.zones.find(za => za.zone === z.zone)
                const zoneMax = hourlyMax.find(hm => hm.zone === z.zone)
                return (
                  <div key={z.zone} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-xs font-medium truncate capitalize">{z.zone}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xl font-bold">{zoneAvg?.[metric] != null ? zoneAvg[metric] : 'N/A'}</div>
                        <div className="text-[10px] text-gray-500">{selected.unit} {selected.label.toLowerCase()} (5-min avg)</div>
                        {zoneMax?.[metric] != null && (
                          <div className="text-[10px] text-gray-400 mt-0.5">↑ Hourly max: {zoneMax[metric]} {selected.unit}</div>
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        z.status === 'online'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {z.status}
                      </span>
                    </div>
                  </div>
                )
              }))
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-[11px] text-gray-600">
          <span>© 2026 SCEMAS · Public Data Portal</span>
          <span>PIPEDA Compliant · Data refreshes every 30 s</span>
        </div>
      </footer>

      <EnvironmentalChatbot zones={zones} loading={loading} />
    </div>
  )
}
