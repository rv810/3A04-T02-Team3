'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import {
  Wind, Bell, AlertTriangle, Activity, Radio, LogOut, CheckCircle2,
  Settings, Users, Plus, Trash2, ToggleLeft, ToggleRight, Pencil, UserPlus,
} from 'lucide-react'
import {
  SENSORS, INITIAL_ALERTS, CHART_DATA, INITIAL_RULES, USERS, ZONES,
  Alert, AlertRule, MetricType, RuleOperator, AlertSeverity, User, Role,
  SEVERITY_STYLES, STATUS_STYLES, SENSOR_STATUS_STYLES,
} from '@/lib/data'

type Tab = 'overview' | 'alerts' | 'history' | 'sensors' | 'rules' | 'users'

const NAV: { id: Tab; label: string; icon: React.ElementType; section?: string }[] = [
  { id: 'overview', label: 'Overview',      icon: Activity      },
  { id: 'alerts',   label: 'Active Alerts', icon: Bell          },
  { id: 'history',  label: 'Alert History', icon: AlertTriangle },
  { id: 'sensors',  label: 'Sensors',       icon: Radio         },
  { id: 'rules',    label: 'Alert Rules',   icon: Settings,  section: 'Administration' },
  { id: 'users',    label: 'Users & Roles', icon: Users          },
]

const ROLE_STYLES = {
  admin:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
  operator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  public:   'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

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

const EMPTY_RULE = {
  name: '', metric: 'aqi' as MetricType, operator: 'gt' as RuleOperator,
  threshold: 75, severity: 'high' as AlertSeverity, enabled: true, zone: '',
}

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS)
  const [rules, setRules]   = useState<AlertRule[]>(INITIAL_RULES)
  const [users, setUsers]   = useState<User[]>([...USERS])
  const [userName, setUserName] = useState('')

  // Alert rule form
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [newRule, setNewRule] = useState({ ...EMPTY_RULE })

  // Edit rule
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editRule, setEditRule] = useState<AlertRule | null>(null)

  // Resolve with note
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')

  // History filters
  const [historyStatus, setHistoryStatus] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all')
  const [historyZone, setHistoryZone]     = useState('all')
  const [historyDate, setHistoryDate]     = useState('')

  // User creation
  const [showUserForm, setShowUserForm] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'operator' as Role })
  const [userError, setUserError] = useState('')

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('scemas_session')
    if (!raw) { router.push('/login'); return }
    const { role, name } = JSON.parse(raw)
    if (role !== 'admin') { router.push('/login'); return }
    setUserName(name)
  }, [router])

  function fireToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

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
  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }
  function deleteRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id))
  }
  function createRule(e: React.FormEvent) {
    e.preventDefault()
    const id = `r${Date.now()}`
    setRules(prev => [...prev, { ...newRule, id }])
    setNewRule({ ...EMPTY_RULE })
    setShowRuleForm(false)
    fireToast(`Rule "${newRule.name}" created`)
  }
  function startEditRule(r: AlertRule) {
    setEditingRuleId(r.id)
    setEditRule({ ...r })
  }
  function saveEditRule(e: React.FormEvent) {
    e.preventDefault()
    if (!editRule) return
    setRules(prev => prev.map(r => r.id === editRule.id ? editRule : r))
    setEditingRuleId(null)
    setEditRule(null)
    fireToast(`Rule "${editRule.name}" updated`)
  }
  function createUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setUserError('Name and email are required.')
      return
    }
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      setUserError('A user with this email already exists.')
      return
    }
    const id = `u${Date.now()}`
    setUsers(prev => [...prev, {
      id,
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      role: newUser.role,
      status: 'active',
      lastLogin: 'Never',
    }])
    setNewUser({ name: '', email: '', role: 'operator' })
    setUserError('')
    setShowUserForm(false)
    fireToast(`User ${newUser.name} created`)
  }

  if (!userName) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">
      Checking session…
    </div>
  )

  const active       = alerts.filter(a => a.status === 'active')
  const acknowledged = alerts.filter(a => a.status === 'acknowledged')
  const activeSensors = SENSORS.filter(s => s.status !== 'offline')

  const filteredHistory = alerts.filter(a => {
    if (historyStatus !== 'all' && a.status !== historyStatus) return false
    if (historyZone !== 'all' && a.zone !== historyZone) return false
    if (historyDate && !a.triggeredAt.startsWith(historyDate)) return false
    return true
  })

  const operatorFmt = (op: RuleOperator) => ({ gt: '>', lt: '<', gte: '≥', lte: '≤' }[op])
  const metricUnit  = (m: MetricType)    => ({ aqi: 'AQI', noise: 'dB', temperature: '°C', humidity: '%' }[m])

  const cityAqi  = Math.round(activeSensors.reduce((s, x) => s + x.aqi, 0) / activeSensors.length)
  const cityNoise = Math.round(activeSensors.reduce((s, x) => s + x.noise, 0) / activeSensors.length)
  const cityTemp  = Math.round(activeSensors.reduce((s, x) => s + x.temperature, 0) / activeSensors.length)
  const cityHumid = Math.round(activeSensors.reduce((s, x) => s + x.humidity, 0) / activeSensors.length)

  const selectCls = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
  const inputCls  = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
            <Wind className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm">SCEMAS</span>
            <div className="text-[9px] text-purple-400 font-medium">ADMIN</div>
          </div>
        </div>

        <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon, section }) => (
            <div key={id}>
              {section && (
                <div className="px-3 pt-3 pb-1 text-[9px] text-gray-600 font-semibold uppercase tracking-wider">
                  {section}
                </div>
              )}
              <button
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  tab === id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {id === 'alerts' && active.length > 0 && (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{active.length}</span>
                )}
              </button>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link href="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            Public View
          </Link>
          <div className="px-3 pt-1">
            <div className="text-xs font-medium text-white truncate">{userName}</div>
            <div className="text-[10px] text-purple-400">Administrator</div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold">Operational Overview</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Sensors',  value: `${activeSensors.length}/${SENSORS.length}`, sub: '1 offline',          subColor: 'text-yellow-400' },
                { label: 'Active Alerts',   value: active.length,  sub: `${acknowledged.length} acknowledged`, subColor: 'text-yellow-400', valueColor: active.length > 0 ? 'text-red-400' : '' },
                { label: 'Readings Today',  value: '47,520',       sub: '5-second intervals',   subColor: 'text-gray-500' },
                { label: 'System Uptime',   value: '99.8%',        sub: 'Last 30 days',         subColor: 'text-gray-500', valueColor: 'text-green-400' },
              ].map(c => (
                <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-2">{c.label}</div>
                  <div className={`text-2xl font-bold tabular-nums ${c.valueColor ?? ''}`}>{c.value}</div>
                  <div className={`text-xs mt-1 ${c.subColor}`}>{c.sub}</div>
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
                    <Line type="monotone" dataKey="aqi"         stroke="#3B82F6" strokeWidth={1.5} dot={false} name="AQI"         />
                    <Line type="monotone" dataKey="noise"       stroke="#A855F7" strokeWidth={1.5} dot={false} name="Noise (dB)"  />
                    <Line type="monotone" dataKey="temperature" stroke="#F97316" strokeWidth={1.5} dot={false} name="Temp (°C)"   />
                    <Line type="monotone" dataKey="humidity"    stroke="#06B6D4" strokeWidth={1.5} dot={false} name="Humidity (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm">Active Alerts</h2>
                <button onClick={() => setTab('alerts')} className="text-xs text-blue-400 hover:text-blue-300">View all →</button>
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

        {/* ── Active Alerts (BE3) ──────────────────────────────────────────── */}
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
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600">All alerts resolved</td></tr>
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

        {/* ── Alert History (BE1) ──────────────────────────────────────────── */}
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
                <input
                  type="date"
                  value={historyDate}
                  onChange={e => setHistoryDate(e.target.value)}
                  className={selectCls}
                />
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

        {/* ── Sensors (BE4) ────────────────────────────────────────────────── */}
        {tab === 'sensors' && (
          <div className="p-6 space-y-5">
            <h1 className="text-xl font-bold">Sensor Network</h1>

            {/* City-wide gauges */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4 text-gray-300">City-Wide Current Readings</h2>
              <div className="flex justify-around flex-wrap gap-4">
                <Gauge value={cityAqi}   max={150} label="Air Quality (AQI)"  unit="AQI" color={aqiColor(cityAqi)}   />
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
                      <td className="px-4 py-3"><span className={`font-medium ${SENSOR_STATUS_STYLES[s.status]}`}>● {s.status}</span></td>
                      <td className="px-4 py-3 text-gray-500">{s.lastSeen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Alert Rules (BE2) ────────────────────────────────────────────── */}
        {tab === 'rules' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Alert Rules</h1>
              <button
                onClick={() => { setShowRuleForm(v => !v); setEditingRuleId(null) }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> New Rule
              </button>
            </div>

            {/* Create Rule Form (BE2) */}
            {showRuleForm && (
              <form onSubmit={createRule} className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-sm text-purple-300">Create Alert Rule</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Rule Name</label>
                    <input required value={newRule.name}
                      onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))}
                      placeholder="e.g. High AQI Alert"
                      className={`w-full ${inputCls}`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Metric</label>
                    <select value={newRule.metric} onChange={e => setNewRule(r => ({ ...r, metric: e.target.value as MetricType }))}
                      className={`w-full ${inputCls}`}>
                      <option value="aqi">AQI</option>
                      <option value="noise">Noise (dB)</option>
                      <option value="temperature">Temperature (°C)</option>
                      <option value="humidity">Humidity (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Condition</label>
                    <select value={newRule.operator} onChange={e => setNewRule(r => ({ ...r, operator: e.target.value as RuleOperator }))}
                      className={`w-full ${inputCls}`}>
                      <option value="gt">Greater than (&gt;)</option>
                      <option value="gte">Greater or equal (≥)</option>
                      <option value="lt">Less than (&lt;)</option>
                      <option value="lte">Less or equal (≤)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Threshold</label>
                    <input required type="number" value={newRule.threshold}
                      onChange={e => setNewRule(r => ({ ...r, threshold: Number(e.target.value) }))}
                      className={`w-full ${inputCls}`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Severity</label>
                    <select value={newRule.severity} onChange={e => setNewRule(r => ({ ...r, severity: e.target.value as AlertSeverity }))}
                      className={`w-full ${inputCls}`}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Zone</label>
                    <select value={newRule.zone ?? ''} onChange={e => setNewRule(r => ({ ...r, zone: e.target.value }))}
                      className={`w-full ${inputCls}`}>
                      <option value="">All Zones</option>
                      {ZONE_NAMES.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">
                    Create Rule
                  </button>
                  <button type="button" onClick={() => setShowRuleForm(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Rules table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    {['Rule Name', 'Metric', 'Condition', 'Zone', 'Severity', 'Enabled', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.map(r => (
                    editingRuleId === r.id && editRule ? (
                      <tr key={r.id} className="border-b border-purple-500/20 bg-purple-500/5">
                        <td className="px-3 py-2">
                          <input value={editRule.name} onChange={e => setEditRule(x => x && ({ ...x, name: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={editRule.metric} onChange={e => setEditRule(x => x && ({ ...x, metric: e.target.value as MetricType }))}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none">
                            <option value="aqi">AQI</option>
                            <option value="noise">Noise</option>
                            <option value="temperature">Temp</option>
                            <option value="humidity">Humidity</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <select value={editRule.operator} onChange={e => setEditRule(x => x && ({ ...x, operator: e.target.value as RuleOperator }))}
                              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none">
                              <option value="gt">&gt;</option>
                              <option value="gte">≥</option>
                              <option value="lt">&lt;</option>
                              <option value="lte">≤</option>
                            </select>
                            <input type="number" value={editRule.threshold} onChange={e => setEditRule(x => x && ({ ...x, threshold: Number(e.target.value) }))}
                              className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none" />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select value={editRule.zone ?? ''} onChange={e => setEditRule(x => x && ({ ...x, zone: e.target.value }))}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none">
                            <option value="">All Zones</option>
                            {ZONE_NAMES.map(z => <option key={z} value={z}>{z}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select value={editRule.severity} onChange={e => setEditRule(x => x && ({ ...x, severity: e.target.value as AlertSeverity }))}
                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-gray-500">—</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={saveEditRule} className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-[10px] text-white transition-colors">Save</button>
                            <button onClick={() => setEditingRuleId(null)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] text-gray-300 transition-colors">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={r.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{r.name}</td>
                        <td className="px-4 py-3 uppercase text-gray-400">{r.metric}</td>
                        <td className="px-4 py-3 font-mono text-gray-300">
                          {operatorFmt(r.operator)} {r.threshold} {metricUnit(r.metric)}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{r.zone || <span className="text-gray-600">All Zones</span>}</td>
                        <td className="px-4 py-3"><Badge className={SEVERITY_STYLES[r.severity]}>{r.severity}</Badge></td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleRule(r.id)} className="flex items-center gap-1.5 transition-colors">
                            {r.enabled
                              ? <><ToggleRight className="w-5 h-5 text-green-400" /><span className="text-green-400">On</span></>
                              : <><ToggleLeft  className="w-5 h-5 text-gray-600" /><span className="text-gray-600">Off</span></>}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { startEditRule(r); setShowRuleForm(false) }} className="p-1.5 text-gray-600 hover:text-purple-400 transition-colors rounded">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteRule(r.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Users & Roles (BE6) ──────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Users & Roles</h1>
              <button
                onClick={() => { setShowUserForm(v => !v); setUserError('') }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4" /> New User
              </button>
            </div>

            {/* Create User Form */}
            {showUserForm && (
              <form onSubmit={createUser} className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-sm text-purple-300">Create User Account</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                    <input required value={newUser.name}
                      onChange={e => { setNewUser(u => ({ ...u, name: e.target.value })); setUserError('') }}
                      placeholder="Jane Smith"
                      className={`w-full ${inputCls}`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <input required type="email" value={newUser.email}
                      onChange={e => { setNewUser(u => ({ ...u, email: e.target.value })); setUserError('') }}
                      placeholder="jane@city.ca"
                      className={`w-full ${inputCls}`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Role</label>
                    <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value as Role }))}
                      className={`w-full ${inputCls}`}>
                      <option value="operator">City Operator</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                {userError && <p className="text-xs text-red-400">{userError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">
                    Create User
                  </button>
                  <button type="button" onClick={() => { setShowUserForm(false); setUserError('') }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    {['Name', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-gray-400">{u.email}</td>
                      <td className="px-4 py-3"><Badge className={ROLE_STYLES[u.role]}>{u.role}</Badge></td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${u.status === 'active' ? 'text-green-400' : 'text-gray-600'}`}>
                          ● {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums">{u.lastLogin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-gray-800 border border-green-500/30 text-green-400 text-sm px-4 py-2.5 rounded-lg shadow-2xl z-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {toast}
        </div>
      )}
    </div>
  )
}
