'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { Wind, Volume2, Thermometer, Droplets, MapPin, MessageSquare, X, Send } from 'lucide-react'
import {
  CHART_DATA, ZONES, SENSORS, CITY_AVG, ZONE_STATUS_STYLES,
} from '@/lib/data'

type Metric = 'aqi' | 'noise' | 'temperature' | 'humidity'

const METRIC_META = [
  { key: 'aqi'         as Metric, label: 'Air Quality Index', unit: 'AQI', icon: Wind,        color: 'text-blue-400',   bg: 'bg-blue-400/10',   stroke: '#3B82F6', yUnit: 'AQI' },
  { key: 'noise'       as Metric, label: 'Noise Level',       unit: 'dB',  icon: Volume2,     color: 'text-purple-400', bg: 'bg-purple-400/10', stroke: '#A855F7', yUnit: 'dB'  },
  { key: 'temperature' as Metric, label: 'Temperature',       unit: '°C',  icon: Thermometer, color: 'text-orange-400', bg: 'bg-orange-400/10', stroke: '#F97316', yUnit: '°C'  },
  { key: 'humidity'    as Metric, label: 'Humidity',          unit: '%',   icon: Droplets,    color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   stroke: '#06B6D4', yUnit: '%'   },
]

const activeSensors = SENSORS.filter(s => s.status !== 'offline')

function aqiLabel(v: number) { return v < 50 ? 'Good' : v < 75 ? 'Moderate' : 'Poor' }
function noiseLabel(v: number) { return v < 65 ? 'Normal' : 'Elevated' }

function getBotResponse(input: string): string {
  const msg = input.toLowerCase()
  if (msg.includes('air') || msg.includes('aqi'))
    return `City-wide average AQI is ${CITY_AVG.aqi} — rated "${aqiLabel(CITY_AVG.aqi)}". The Industrial Zone is highest at 80 AQI. West District has the cleanest air at 38 AQI.`
  if (msg.includes('noise'))
    return `Average noise across active sensors is ${CITY_AVG.noise} dB. The Industrial Zone exceeds the 80 dB alert threshold. West District is quietest at ~52 dB.`
  if (msg.includes('temp'))
    return `Current city average temperature is ${CITY_AVG.temperature}°C. The Industrial Zone is warmest at 26°C.`
  if (msg.includes('humid'))
    return `Average humidity is ${CITY_AVG.humidity}%. All zones are within normal range (40–70%). East District is slightly higher at 63%.`
  if (msg.includes('alert') || msg.includes('warn'))
    return 'There are 3 active alerts: 2 high-severity in the Industrial Zone (noise & AQI) and 1 medium-severity in Downtown Core (AQI). City operators are monitoring the situation.'
  if (msg.includes('zone') || msg.includes('area') || msg.includes('district'))
    return 'The city has 4 monitoring zones: Downtown Core (moderate), East District (moderate), West District (good — best air quality), Industrial Zone (poor — active alerts).'
  if (msg.includes('sensor'))
    return `${activeSensors.length} of ${SENSORS.length} sensors are active and reporting every 5 seconds. Sensor ET-03 (East District) is currently offline.`
  if (/^(hi|hello|hey)/.test(msg))
    return "Hi! I'm the SCEMAS environmental assistant. Ask me about air quality, noise, temperature, humidity, city zones, or active alerts."
  return 'I can help with: air quality (AQI), noise levels, temperature, humidity, zone status, and active alerts. What would you like to know?'
}

export default function PublicDashboard() {
  const [metric, setMetric] = useState<Metric>('aqi')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm the SCEMAS AI assistant. Ask me about current environmental conditions in the city." },
  ])
  const [clock, setClock] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleString('en-CA', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage() {
    const text = chatInput.trim()
    if (!text) return
    setMessages(prev => [...prev, { from: 'user', text }])
    setChatInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: getBotResponse(text) }])
    }, 350)
  }

  const selected = METRIC_META.find(m => m.key === metric)!

  const metricValues: Record<Metric, number> = {
    aqi: CITY_AVG.aqi,
    noise: CITY_AVG.noise,
    temperature: CITY_AVG.temperature,
    humidity: CITY_AVG.humidity,
  }
  const metricStatus: Record<Metric, string> = {
    aqi:         aqiLabel(CITY_AVG.aqi),
    noise:       noiseLabel(CITY_AVG.noise),
    temperature: 'Normal',
    humidity:    'Normal',
  }
  const statusGood = (m: Metric) => ['Good', 'Normal'].includes(metricStatus[m])

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
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
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
            Live readings from {activeSensors.length} active sensors across {ZONES.length} zones · Updated every 5 s
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {METRIC_META.map(m => {
            const Icon = m.icon
            const v = metricValues[m.key]
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
                  {v}
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
          </div>
        </div>

        {/* Zone Status */}
        <div>
          <h2 className="font-semibold text-sm mb-3">Zone Status</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {ZONES.map(z => (
              <div key={z.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{z.name}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xl font-bold">{z.avgAqi}</div>
                    <div className="text-[10px] text-gray-500">avg AQI</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${ZONE_STATUS_STYLES[z.status]}`}>
                    {z.status}
                  </span>
                </div>
                <div className="text-[10px] text-gray-600 mt-2">{z.active}/{z.sensors} sensors active</div>
              </div>
            ))}
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
        <div className="fixed bottom-5 right-5 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50" style={{ height: '420px' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold">Environmental Assistant</div>
                <div className="text-[10px] text-green-400">AI · Powered by SCEMAS</div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
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
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-gray-800 flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Ask about air quality, noise…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 w-13 h-13 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center transition-colors z-50 p-3.5"
          title="Ask the environmental assistant"
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  )
}
