/**
 * Public environmental dashboard.
 *
 * Subsystem: Consumes Telemetry Data Management and Alert Rules Management subsystems
 * PAC Layer: Presentation
 * Reqs:      BE4, BE5
 */

'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { Wind, Thermometer, Droplets, MapPin, MessageSquare, X, Send } from 'lucide-react'
import { getAllZones, getMetricsHistory, getChatResponse } from '@/lib/api'
import type { ZoneSummary, MetricsHistoryPoint } from '@/lib/types'

type Metric = 'temperature' | 'humidity' | 'oxygen'

const METRIC_META = [
  { key: 'temperature' as Metric, label: 'Temperature',  unit: '°C', icon: Thermometer, color: 'text-orange-400', bg: 'bg-orange-400/10', stroke: '#F97316', yUnit: '°C' },
  { key: 'humidity'    as Metric, label: 'Humidity',      unit: '%',  icon: Droplets,    color: 'text-cyan-400',   bg: 'bg-cyan-400/10',  stroke: '#06B6D4', yUnit: '%'  },
  { key: 'oxygen'      as Metric, label: 'Oxygen',        unit: '%',  icon: Wind,        color: 'text-green-400',  bg: 'bg-green-400/10', stroke: '#22C55E', yUnit: '%'  },
]

function getStatusLabel(metric: Metric, value: number): string {
  if (metric === 'temperature') return value >= 15 && value <= 30 ? 'Normal' : 'Extreme'
  if (metric === 'humidity') return value >= 30 && value <= 70 ? 'Normal' : 'Abnormal'
  return value >= 19 && value <= 22 ? 'Normal' : 'Low'
}


export default function PublicDashboard() {
  const [metric, setMetric] = useState<Metric>('temperature')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm the SCEMAS AI assistant. Ask me about current environmental conditions in the city." },
  ])
  const [clock, setClock] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [zones, setZones] = useState<ZoneSummary[]>([])
  const [history, setHistory] = useState<MetricsHistoryPoint[]>([])
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
        const [z, h] = await Promise.all([getAllZones(), getMetricsHistory()])
        if (!cancelled) {
          setZones(z)
          setHistory(h)
        }
      } catch (err) {
        console.error('Failed to fetch public data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData().then(() => {
      if (!cancelled) {
        // Public users don't have auth tokens for WebSocket — polling at 30s
        // is sufficient because metrics data is hourly-bucketed.
        intervalId = setInterval(async () => {
          try {
            const z = await getAllZones()
            if (!cancelled) setZones(z)
          } catch { /* silent re-fetch failure */ }
        }, 5_000)
      }
    })

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = chatInput.trim()
    if (!text || isTyping) return
    setMessages(prev => [...prev, { from: 'user', text }])
    setChatInput('')
    setIsTyping(true)
    try {
      const { reply } = await getChatResponse(text)
      setMessages(prev => [...prev, { from: 'bot', text: reply }])
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, I could not reach the server. Please try again.' }])
    } finally {
      setIsTyping(false)
    }
  }

  // Compute city-wide averages from zone data
  function computeAverage(key: Metric): number | null {
    const values = zones.map(z => z[key]?.value).filter((v): v is number => v != null)
    if (values.length === 0) return null
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  }

  const cityAvg: Record<Metric, number | null> = {
    temperature: computeAverage('temperature'),
    humidity: computeAverage('humidity'),
    oxygen: computeAverage('oxygen'),
  }

  const metricStatus: Record<Metric, string> = {
    temperature: cityAvg.temperature != null ? getStatusLabel('temperature', cityAvg.temperature) : '—',
    humidity:    cityAvg.humidity != null ? getStatusLabel('humidity', cityAvg.humidity) : '—',
    oxygen:      cityAvg.oxygen != null ? getStatusLabel('oxygen', cityAvg.oxygen) : '—',
  }

  const statusGood = (m: Metric) => ['Normal'].includes(metricStatus[m])

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
          <p className="text-xs text-gray-500 mb-1">Public · Real-time environmental data</p>
          <h1 className="text-2xl font-bold">City Environmental Status</h1>
          <p className="text-sm text-gray-400 mt-1">
            Live readings from {zones.length} monitored zone{zones.length !== 1 ? 's' : ''} · Updated every 5 s
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
                <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
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
                  <XAxis
                    dataKey="time"
                    stroke="#374151"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    interval={3}
                  />
                  <YAxis
                    stroke="#374151"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    unit={` ${selected.yUnit}`}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={selected.stroke}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
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
              zones.map(z => (
                <div key={z.zone} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-xs font-medium truncate capitalize">{z.zone}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xl font-bold">{z[metric]?.value != null ? z[metric].value : 'N/A'}</div>
                      <div className="text-[10px] text-gray-500">{selected.unit} {selected.label.toLowerCase()}</div>
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
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-[11px] text-gray-600">
          <span>© 2026 SCEMAS · Public Data Portal</span>
          <span>PIPEDA Compliant · Data refreshes every 5 s</span>
        </div>
      </footer>

      {/* AI Chatbot */}
      {chatOpen ? (
        <div className="fixed bottom-5 right-5 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50" style={{ height: '500px' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-white" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs font-semibold">Environmental Assistant</div>
                <div className="text-[10px] text-green-400">AI · Powered by SCEMAS</div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-gray-600 hover:text-gray-300 transition-colors" aria-label="Close chat">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] text-xs px-3 py-2 rounded-xl leading-relaxed ${
                    msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 text-xs px-3 py-2 rounded-xl flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick-reply suggestion chips */}
          {!isTyping && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {[
                'How is the air quality today?',
                'What is the temperature?',
                'Current humidity levels',
                'Are there any alerts?',
                'Zone status overview',
                'Oxygen levels',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setChatInput(suggestion)
                    // fire immediately
                    setMessages(prev => [...prev, { from: 'user', text: suggestion }])
                    setIsTyping(true)
                    getChatResponse(suggestion)
                      .then(({ reply }) => setMessages(prev => [...prev, { from: 'bot', text: reply }]))
                      .catch(() => setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, I could not reach the server. Please try again.' }]))
                      .finally(() => { setIsTyping(false); setChatInput('') })
                  }}
                  className="text-[10px] px-2 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-300 hover:border-blue-500 hover:text-blue-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-gray-800 flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              placeholder="Ask about temperature, humidity..."
              value={chatInput}
              disabled={isTyping}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={isTyping}
              className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 w-13 h-13 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center transition-colors z-50 p-3.5"
          title="Ask the environmental assistant" aria-label="Ask the environmental assistant"
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  )
}
