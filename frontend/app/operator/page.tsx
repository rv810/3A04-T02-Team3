'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import {
  Wind, Bell, AlertTriangle, Activity, Radio, LogOut, CheckCircle2,
} from 'lucide-react'
import {
  SENSORS, INITIAL_ALERTS, CHART_DATA, ZONES, Alert,
  SEVERITY_STYLES, STATUS_STYLES, SENSOR_STATUS_STYLES,
} from '@/lib/data'

type Tab = 'overview' | 'alerts' | 'history' | 'sensors'

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview',      icon: Activity      },
  { id: 'alerts',   label: 'Active Alerts', icon: Bell          },
  { id: 'history',  label: 'Alert History', icon: AlertTriangle },
  { id: 'sensors',  label: 'Sensors',       icon: Radio         },
]

const ZONE_NAMES = ZONES.map(z => z.name)

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${className}`}>
      {children}
    </span>
  )
}

// SVG arc gauge
function Gauge({ value, max, label, unit, color }: {
  value: number; max: number; label: string; unit: string; color: string
}) {
  const r = 34
  const circ = 2 * Math.PI * r
  const bgLen = circ * 0.75
  const valLen = bgLen * Math.min(value / max, 1)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1F2937" strokeWidth="9"
          strokeDasharray={`${bgLen} ${circ - bgLen}`} transform="rotate(135 50 50)" strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${valLen} ${circ - valLen}`} transform="rotate(135 50 50)" strokeLinecap="round" />
        <text x="50" y="46" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="16" fontWeight="bold">
          {value}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#6B7280" fontSize="9">
          {unit}
        </text>
      </svg>
      <div className="text-xs text-gray-400 text-center">{label}</div>
    </div>
  )
}

function aqiColor(v: number) { return v < 50 ? '#22C55E' : v < 100 ? '#EAB308' : '#EF4444' }
function noiseColor(v: number) { return v < 65 ? '#22C55E' : v < 80 ? '#EAB308' : '#EF4444' }
function humidColor(v: number) { return v < 40 || v > 70 ? '#EAB308' : '#22C55E' }

export default function OperatorDashboard() {
  const router = useRouter()
  const [tab, setTab]       = useState<Tab>('overview')
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')

  // Resolve with note
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')

  // History filters
  const [historyStatus, setHistoryStatus] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all')
  const [historyZone, setHistoryZone]     = useState('all')
  const [historyDate, setHistoryDate]     = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('scemas_session')
    if (!raw) { router.push('/login'); return }
    const { role, name } = JSON.parse(raw)
    if (role !== 'admin' && role !== 'operator') { router.push('/login'); return }
    setUserName(name)
    setUserRole(role)
  }, [router])

  function acknowledge(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' as const } : a))
  }
  function startResolve(id: string) {
    setResolvingId(id)
    setResolveNote('')
  }
  function confirmResolve(id: string) {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'resolved' as const, resolvedNote: resolveNote || undefined } : a
    ))
    setResolvingId(null)
    setResolveNote('')
  }
  function logout() {
    localStorage.removeItem('scemas_session')
    router.push('/')
  }

  if (!userName) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">
      Checking session…
    </div>
  )

  const active        = alerts.filter(a => a.status === 'active')
  const acknowledged  = alerts.filter(a => a.status === 'acknowledged')
  const activeSensors = SENSORS.filter(s => s.status !== 'offline')

  const filteredHistory = alerts.filter(a => {
    if (historyStatus !== 'all' && a.status !== historyStatus) return false
    if (historyZone !== 'all' && a.zone !== historyZone) return false
    if (historyDate && !a.triggeredAt.startsWith(historyDate)) return false
    return true
  })

  const cityAqi   = Math.round(activeSensors.reduce((s, x) => s + x.aqi, 0) / activeSensors.length)
  const cityNoise = Math.round(activeSensors.reduce((s, x) => s + x.noise, 0) / activeSensors.length)
  const cityTemp  = Math.round(activeSensors.reduce((s, x) => s + x.temperature, 0) / activeSensors.length)
  const cityHumid = Math.round(activeSensors.reduce((s, x) => s + x.humidity, 0) / activeSensors.length)

  const selectCls = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <Wind className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">SCEMAS</span>
        </div>

        <nav className="p-2 space-y-0.5 flex-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                tab === id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {id === 'alerts' && active.length > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{active.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link href="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            Public View
          </Link>
          <div className="px-3 pt-1">
            <div className="text-xs font-medium text-white truncate">{userName}</div>
            <div className="text-[10px] text-gray-500 capitalize">{userRole}</div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">

        {/* ── Overview ───────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold">Operational Overview</h1>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Sensors', value: `${activeSensors.length}/${SENSORS.length}`, sub: '1 offline',          subColor: 'text-yellow-400' },
                { label: 'Active Alerts',  value: active.length,       sub: `${acknowledged.length} acknowledged`, subColor: 'text-yellow-400', valueColor: active.length > 0 ? 'text-red-400' : undefined },
                { label: 'Readings Today', value: '47,520',            sub: '5-second intervals', subColor: 'text-gray-500' },
                { label: 'System Uptime',  value: '99.8%',             sub: 'Last 30 days',       subColor: 'text-gray-500', valueColor: 'text-green-400' },
              ].map(card => (
                <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-2">{card.label}</div>
                  <div className={`text-2xl font-bold tabular-nums ${card.valueColor ?? ''}`}>{card.value}</div>
                  <div className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4">24-Hour City-Wide Trends</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="time" stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280' }} interval={3} />
                    <YAxis stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: 12 }} />
                    <Legend iconType="line" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="aqi"         stroke="#3B82F6" strokeWidth={1.5} dot={false} name="AQI"          />
                    <Line type="monotone" dataKey="noise"       stroke="#A855F7" strokeWidth={1.5} dot={false} name="Noise (dB)"   />
                    <Line type="monotone" dataKey="temperature" stroke="#F97316" strokeWidth={1.5} dot={false} name="Temp (°C)"    />
                    <Line type="monotone" dataKey="humidity"    stroke="#06B6D4" strokeWidth={1.5} dot={false} name="Humidity (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm">Active Alerts</h2>
                <button onClick={() => setTab('alerts')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  View all →
                </button>
              </div>
              {active.length === 0 ? (
                <div className="flex items-center gap-2 py-6 justify-center text-sm text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> No active alerts
                </div>
              ) : (
                <div className="space-y-2">
                  {active.slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      <Badge className={SEVERITY_STYLES[a.severity]}>{a.severity}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{a.message}</div>
                        <div className="text-[10px] text-gray-500">{a.sensorName} · {a.zone} · {a.triggeredAt}</div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => acknowledge(a.id)} className="text-[10px] px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">ACK</button>
                        <button onClick={() => { setTab('alerts'); startResolve(a.id) }} className="text-[10px] px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors">Resolve</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Active Alerts (BE3) ─────────────────────────────────────────────── */}
        {tab === 'alerts' && (
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-bold">Active & Acknowledged Alerts</h1>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    {['Sensor', 'Zone', 'Metric', 'Message', 'Severity', 'Status', 'Triggered', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.filter(a => a.status !== 'resolved').length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-600">All alerts resolved</td>
                    </tr>
                  )}
                  {alerts.filter(a => a.status !== 'resolved').map(a => (
                    <tr key={a.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">{a.sensorName}</td>
                      <td className="px-4 py-3 text-gray-400">{a.zone}</td>
                      <td className="px-4 py-3 uppercase text-gray-500">{a.metric}</td>
                      <td className="px-4 py-3 max-w-xs">{a.message}</td>
                      <td className="px-4 py-3"><Badge className={SEVERITY_STYLES[a.severity]}>{a.severity}</Badge></td>
                      <td className="px-4 py-3"><Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge></td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums">{a.triggeredAt}</td>
                      <td className="px-4 py-3">
                        {resolvingId === a.id ? (
                          <div className="flex flex-col gap-1.5 min-w-[180px]">
                            <input
                              autoFocus
                              value={resolveNote}
                              onChange={e => setResolveNote(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && confirmResolve(a.id)}
                              placeholder="Resolution note (optional)"
                              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                            />
                            <div className="flex gap-1">
                              <button onClick={() => confirmResolve(a.id)} className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-[10px]">Confirm</button>
                              <button onClick={() => setResolvingId(null)}  className="px-2 py-1 bg-gray-700 text-gray-400 rounded hover:bg-gray-600 text-[10px]">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            {a.status === 'active' && (
                              <button onClick={() => acknowledge(a.id)} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">ACK</button>
                            )}
                            <button onClick={() => startResolve(a.id)} className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors">Resolve</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Alert History (BE1) ─────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-bold">Alert History</h1>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Status</label>
                <select value={historyStatus} onChange={e => setHistoryStatus(e.target.value as typeof historyStatus)} className={selectCls}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Zone</label>
                <select value={historyZone} onChange={e => setHistoryZone(e.target.value)} className={selectCls}>
                  <option value="all">All zones</option>
                  {ZONE_NAMES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Date</label>
                <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className={selectCls} />
              </div>
              {(historyStatus !== 'all' || historyZone !== 'all' || historyDate) && (
                <div className="flex flex-col gap-1 justify-end">
                  <button
                    onClick={() => { setHistoryStatus('all'); setHistoryZone('all'); setHistoryDate('') }}
                    className="px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    {['Sensor', 'Zone', 'Metric', 'Message', 'Severity', 'Status', 'Triggered', 'Note'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-600">
                        No alerts match the current filters. Try adjusting your search.
                      </td>
                    </tr>
                  )}
                  {filteredHistory.map(a => (
                    <tr key={a.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">{a.sensorName}</td>
                      <td className="px-4 py-3 text-gray-400">{a.zone}</td>
                      <td className="px-4 py-3 uppercase text-gray-500">{a.metric}</td>
                      <td className="px-4 py-3 max-w-xs">{a.message}</td>
                      <td className="px-4 py-3"><Badge className={SEVERITY_STYLES[a.severity]}>{a.severity}</Badge></td>
                      <td className="px-4 py-3"><Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge></td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums">{a.triggeredAt}</td>
                      <td className="px-4 py-3 text-gray-600 italic">{a.resolvedNote ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Sensors (BE4) ──────────────────────────────────────────────────── */}
        {tab === 'sensors' && (
          <div className="p-6 space-y-5">
            <h1 className="text-xl font-bold">Sensor Network</h1>

            {/* City-wide gauges */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4 text-gray-300">City-Wide Current Readings</h2>
              <div className="flex justify-around flex-wrap gap-4">
                <Gauge value={cityAqi}   max={150} label="Air Quality (AQI)"  unit="AQI" color={aqiColor(cityAqi)}    />
                <Gauge value={cityNoise} max={100} label="Noise Level"        unit="dB"  color={noiseColor(cityNoise)} />
                <Gauge value={cityTemp}  max={40}  label="Temperature"        unit="°C"  color="#F97316" />
                <Gauge value={cityHumid} max={100} label="Humidity"           unit="%"   color={humidColor(cityHumid)} />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    {['Sensor', 'Zone', 'AQI', 'Noise (dB)', 'Temp (°C)', 'Humidity (%)', 'Status', 'Last Seen'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SENSORS.map(s => (
                    <tr key={s.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold">{s.name}</td>
                      <td className="px-4 py-3 text-gray-400">{s.zone}</td>
                      <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.aqi         : <span className="text-gray-700">—</span>}</td>
                      <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.noise       : <span className="text-gray-700">—</span>}</td>
                      <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.temperature : <span className="text-gray-700">—</span>}</td>
                      <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.humidity    : <span className="text-gray-700">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${SENSOR_STATUS_STYLES[s.status]}`}>● {s.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.lastSeen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
