/**
 * Public-facing environmental chatbot assistant.
 *
 * Subsystem: Consumes Telemetry Data Management subsystem (via props)
 * PAC Layer: Presentation
 * Reqs:      BE4, BE5
 */

'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send } from 'lucide-react'
import type { ZoneSummary } from '@/lib/types'

type Metric = 'temperature' | 'humidity' | 'oxygen'
type ChatMessage = { from: 'bot' | 'user'; text: string; chips?: string[] }

interface Props {
  zones: ZoneSummary[]
  loading: boolean
}

const QUICK_OPTIONS: { label: string; q: string }[] = [
  { label: 'Air quality today?',      q: 'How is the air quality today?' },
  { label: 'Temperature now',         q: 'What is the temperature?' },
  { label: 'Humidity levels',         q: 'What is the humidity?' },
  { label: 'Oxygen levels',           q: 'What are the oxygen levels?' },
  { label: 'Any alerts?',             q: 'Are there any active alerts in my area?' },
  { label: 'Zone status',             q: 'Which zones are being monitored?' },
  { label: 'Is it safe to go outside?', q: 'Is it safe to go outside today?' },
]

function getStatusLabel(metric: Metric, value: number): string {
  if (metric === 'temperature') return value >= 15 && value <= 30 ? 'Normal' : 'Extreme'
  if (metric === 'humidity')    return value >= 30 && value <= 70 ? 'Normal' : 'Abnormal'
  return value >= 19 && value <= 22 ? 'Normal' : 'Low'
}

export default function EnvironmentalChatbot({ zones, loading }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: 'bot', text: "Hi! I'm the SCEMAS environmental assistant. Tap a quick question below or type your own." },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Derive city-wide averages and status from the zones prop
  function avg(key: Metric): number | null {
    const vals = zones.map(z => z[key]?.value).filter((v): v is number => v != null)
    if (vals.length === 0) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }

  const cityAvg: Record<Metric, number | null> = {
    temperature: avg('temperature'),
    humidity:    avg('humidity'),
    oxygen:      avg('oxygen'),
  }

  const metricStatus: Record<Metric, string> = {
    temperature: cityAvg.temperature != null ? getStatusLabel('temperature', cityAvg.temperature) : '—',
    humidity:    cityAvg.humidity    != null ? getStatusLabel('humidity',    cityAvg.humidity)    : '—',
    oxygen:      cityAvg.oxygen      != null ? getStatusLabel('oxygen',      cityAvg.oxygen)      : '—',
  }

  function getBotResponse(input: string): ChatMessage {
    if (loading) return { from: 'bot', text: 'Data is still loading — please try again in a moment.' }

    const msg = input.toLowerCase()

    const abnormalCount = (['temperature', 'humidity', 'oxygen'] as Metric[]).filter(
      m => metricStatus[m] !== 'Normal'
    ).length
    const airQualityRating = abnormalCount === 0 ? 'Good' : abnormalCount === 1 ? 'Moderate' : 'Poor'

    if (/^(hi|hello|hey)/.test(msg))
      return {
        from: 'bot',
        text: "Hi! I'm the SCEMAS environmental assistant. I can tell you about air quality, temperature, humidity, oxygen levels, zone status, and more.",
        chips: ['Air quality today?', 'Any alerts?', 'Is it safe to go outside?'],
      }

    if (msg.includes('air quality') || msg.includes('air') || (msg.includes('quality') && !msg.includes('data'))) {
      const detail = [
        cityAvg.temperature != null ? `Temperature: ${cityAvg.temperature}°C (${metricStatus.temperature})` : null,
        cityAvg.humidity    != null ? `Humidity: ${cityAvg.humidity}% (${metricStatus.humidity})`           : null,
        cityAvg.oxygen      != null ? `Oxygen: ${cityAvg.oxygen}% (${metricStatus.oxygen})`                 : null,
      ].filter(Boolean).join(' · ')
      return {
        from: 'bot',
        text: `Overall air quality is currently ${airQualityRating}. ${detail}.`,
        chips: ['Is it safe to go outside?', 'Which zones are affected?', 'What does this mean?'],
      }
    }

    if (msg.includes('safe') || msg.includes('outside') || msg.includes('outdoor') || msg.includes('go out')) {
      if (abnormalCount === 0)
        return {
          from: 'bot',
          text: 'All environmental metrics are within normal ranges — conditions are safe for outdoor activities.',
          chips: ['Air quality today?', 'Zone status'],
        }
      const flagged = (['temperature', 'humidity', 'oxygen'] as Metric[])
        .filter(m => metricStatus[m] !== 'Normal')
        .map(m => `${m} (${metricStatus[m]})`)
        .join(', ')
      return {
        from: 'bot',
        text: `Conditions may be unfavourable. Abnormal readings detected for: ${flagged}. Consider limiting prolonged outdoor exposure.`,
        chips: ["What's wrong?", 'Any alerts?', 'Which zones are affected?'],
      }
    }

    if (msg.includes('mean') || (msg.includes('what') && msg.includes('wrong')) || msg.includes('explain') || msg.includes('why')) {
      const issues: string[] = []
      if (metricStatus.temperature !== 'Normal') issues.push(`Temperature is ${metricStatus.temperature.toLowerCase()} — normal range is 15–30°C.`)
      if (metricStatus.humidity    !== 'Normal') issues.push(`Humidity is ${metricStatus.humidity.toLowerCase()} — normal range is 30–70%.`)
      if (metricStatus.oxygen      !== 'Normal') issues.push(`Oxygen is ${metricStatus.oxygen.toLowerCase()} — normal range is 19–22%.`)
      return {
        from: 'bot',
        text: issues.length > 0 ? issues.join(' ') : 'All metrics are within normal ranges. No issues detected.',
        chips: ['Is it safe to go outside?', 'Zone status'],
      }
    }

    if (msg.includes('temp')) {
      if (cityAvg.temperature == null) return { from: 'bot', text: 'Temperature data is not available right now.' }
      return {
        from: 'bot',
        text: `City-wide average temperature is ${cityAvg.temperature}°C — ${metricStatus.temperature.toLowerCase()}. Normal range is 15–30°C.`,
        chips: ['Humidity levels', 'Air quality today?'],
      }
    }

    if (msg.includes('humid')) {
      if (cityAvg.humidity == null) return { from: 'bot', text: 'Humidity data is not available right now.' }
      return {
        from: 'bot',
        text: `City-wide average humidity is ${cityAvg.humidity}% — ${metricStatus.humidity.toLowerCase()}. Normal range is 30–70%.`,
        chips: ['Temperature now', 'Air quality today?'],
      }
    }

    if (msg.includes('oxygen') || msg.includes('o2')) {
      if (cityAvg.oxygen == null) return { from: 'bot', text: 'Oxygen data is not available right now.' }
      return {
        from: 'bot',
        text: `City-wide average oxygen level is ${cityAvg.oxygen}% — ${metricStatus.oxygen.toLowerCase()}. Normal range is 19–22%.`,
        chips: ['Air quality today?', 'Is it safe to go outside?'],
      }
    }

    if (msg.includes('alert') || msg.includes('warn') || msg.includes('emergency') || msg.includes('my area')) {
      const offline = zones.filter(z => z.status !== 'online')
      const base = offline.length > 0
        ? `${offline.length} zone(s) are currently offline: ${offline.map(z => z.zone).join(', ')}.`
        : 'All monitored zones are online.'
      return {
        from: 'bot',
        text: `${base} Detailed alert information is available to city operators. For emergencies, contact local authorities.`,
        chips: ['Zone status', 'Air quality today?'],
      }
    }

    if (msg.includes('zone') || msg.includes('area') || msg.includes('district') || msg.includes('monitor')) {
      if (zones.length === 0) return { from: 'bot', text: 'No zone data is available right now.' }
      const online  = zones.filter(z => z.status === 'online')
      const offline = zones.filter(z => z.status !== 'online')
      return {
        from: 'bot',
        text: `Monitoring ${zones.length} zone${zones.length !== 1 ? 's' : ''}. Online: ${online.map(z => z.zone).join(', ') || 'none'}${offline.length > 0 ? `. Offline: ${offline.map(z => z.zone).join(', ')}` : ''}.`,
        chips: ['Air quality today?', 'Any alerts?'],
      }
    }

    if (msg.includes('sensor'))
      return {
        from: 'bot',
        text: `Sensors are active across ${zones.length} zones, providing real-time temperature, humidity, and oxygen readings every 5 seconds.`,
        chips: ['Zone status', 'Air quality today?'],
      }

    return {
      from: 'bot',
      text: 'I can help with air quality, temperature, humidity, oxygen levels, zone status, and alerts. Try one of the quick options below.',
      chips: ['Air quality today?', 'Zone status', 'Any alerts?', 'Is it safe to go outside?'],
    }
  }

  function sendMessage(override?: string) {
    const text = (override ?? input).trim()
    if (!text) return
    setMessages(prev => [...prev, { from: 'user', text }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, getBotResponse(text)])
    }, 350)
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 w-13 h-13 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center transition-colors z-50 p-3.5"
        title="Ask the environmental assistant"
        aria-label="Ask the environmental assistant"
      >
        <MessageSquare className="w-5 h-5 text-white" />
      </button>
    )

  return (
    <div
      className="fixed bottom-5 right-5 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col z-50"
      style={{ height: '480px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <MessageSquare className="w-3 h-3 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-semibold">Environmental Assistant</div>
            <div className="text-[10px] text-green-400">● Live · SCEMAS</div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-600 hover:text-gray-300 transition-colors"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.from === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[88%] text-xs px-3 py-2 rounded-xl leading-relaxed ${
                msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
              }`}
            >
              {msg.text}
            </div>
            {msg.from === 'bot' && msg.chips && msg.chips.length > 0 && i === messages.length - 1 && (
              <div className="flex flex-wrap gap-1 mt-1.5 max-w-[88%]">
                {msg.chips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="text-[10px] px-2 py-1 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Quick-option chips */}
      <div className="px-3 pt-2 pb-1 border-t border-gray-800 flex-shrink-0">
        <p className="text-[9px] text-gray-600 mb-1.5 uppercase tracking-wide">Quick questions</p>
        <div className="flex flex-wrap gap-1">
          {QUICK_OPTIONS.map(opt => (
            <button
              key={opt.q}
              onClick={() => sendMessage(opt.q)}
              className="text-[10px] px-2 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 flex gap-2 flex-shrink-0">
        <input
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          placeholder="Type a question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={() => sendMessage()}
          className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          aria-label="Send message"
        >
          <Send className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  )
}
