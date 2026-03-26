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
  SENSORS, INITIAL_ALERTS, CHART_DATA, Alert,
  SEVERITY_STYLES, STATUS_STYLES, SENSOR_STATUS_STYLES,
} from '@/lib/data'

type Tab = 'overview' | 'alerts' | 'history' | 'sensors'

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview',      icon: Activity       },
  { id: 'alerts',   label: 'Active Alerts', icon: Bell           },
  { id: 'history',  label: 'Alert History', icon: AlertTriangle  },
  { id: 'sensors',  label: 'Sensors',       icon: Radio          },
]

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${className}`}>
      {children}
    </span>
  )
}

export default function OperatorDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')

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
  function resolve(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as const } : a))
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

  const active = alerts.filter(a => a.status === 'active')
  const acknowledged = alerts.filter(a => a.status === 'acknowledged')
  const activeSensors = SENSORS.filter(s => s.status !== 'offline')

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
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                tab === id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {id === 'alerts' && active.length > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {active.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Public View
          </Link>
          <div className="px-3 pt-1">
            <div className="text-xs font-medium text-white truncate">{userName}</div>
            <div className="text-[10px] text-gray-500 capitalize">{userRole}</div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">

        {/* ── Overview ───────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold">Operational Overview</h1>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Sensors',  value: `${activeSensors.length}/${SENSORS.length}`, sub: '1 offline',          subColor: 'text-yellow-400' },
                { label: 'Active Alerts',   value: active.length,        sub: `${acknowledged.length} acknowledged`, subColor: 'text-yellow-400',   valueColor: active.length > 0 ? 'text-red-400' : undefined },
                { label: 'Readings Today',  value: '47,520',             sub: '5-second intervals', subColor: 'text-gray-500' },
                { label: 'System Uptime',   value: '99.8%',              sub: 'Last 30 days',       subColor: 'text-gray-500', valueColor: 'text-green-400' },
              ].map(card => (
                <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-2">{card.label}</div>
                  <div className={`text-2xl font-bold tabular-nums ${card.valueColor ?? ''}`}>{card.value}</div>
                  <div className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Multi-metric chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4">24-Hour City-Wide Trends</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="time" stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280' }} interval={3} />
                    <YAxis stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: 12 }}
                    />
                    <Legend iconType="line" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="aqi"         stroke="#3B82F6" strokeWidth={1.5} dot={false} name="AQI"        />
                    <Line type="monotone" dataKey="noise"       stroke="#A855F7" strokeWidth={1.5} dot={false} name="Noise (dB)" />
                    <Line type="monotone" dataKey="temperature" stroke="#F97316" strokeWidth={1.5} dot={false} name="Temp (°C)"  />
                    <Line type="monotone" dataKey="humidity"    stroke="#06B6D4" strokeWidth={1.5} dot={false} name="Humidity (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent active alerts */}
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
                        <button onClick={() => resolve(a.id)}     className="text-[10px] px-2 py-1 bg-green-500/20  text-green-400  rounded hover:bg-green-500/30  transition-colors">Resolve</button>
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
                        <div className="flex gap-1">
                          {a.status === 'active' && (
                            <button onClick={() => acknowledge(a.id)} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">ACK</button>
                          )}
                          <button onClick={() => resolve(a.id)} className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors">Resolve</button>
                        </div>
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
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    {['Sensor', 'Zone', 'Metric', 'Message', 'Severity', 'Status', 'Triggered'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">{a.sensorName}</td>
                      <td className="px-4 py-3 text-gray-400">{a.zone}</td>
                      <td className="px-4 py-3 uppercase text-gray-500">{a.metric}</td>
                      <td className="px-4 py-3 max-w-xs">{a.message}</td>
                      <td className="px-4 py-3"><Badge className={SEVERITY_STYLES[a.severity]}>{a.severity}</Badge></td>
                      <td className="px-4 py-3"><Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge></td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums">{a.triggeredAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Sensors (BE4) ──────────────────────────────────────────────────── */}
        {tab === 'sensors' && (
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-bold">Sensor Network</h1>
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
                      <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.aqi  : <span className="text-gray-700">—</span>}</td>
                      <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.noise : <span className="text-gray-700">—</span>}</td>
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
