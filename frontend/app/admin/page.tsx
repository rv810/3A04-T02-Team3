'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, Activity, Radio, Settings, Users } from 'lucide-react'
import {
  logout as apiLogout,
  getAlerts, acknowledgeAlert, resolveAlert,
  getSensors, getCityAverages, getMetricsHistory,
  getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, toggleAlertRule,
  listUsers, adminCreateUser,
} from '@/lib/api'
import type {
  Session, AlertsInfo, SensorReading, CityAverages, MetricsHistoryPoint,
  AlertRule, AccountInformation, CreateAlertRuleRequest, UpdateAlertRuleRequest, AdminCreateAccountRequest,
} from '@/lib/types'
import { useWebSocket } from '@/lib/useWebSocket'
import { Sidebar }           from '@/components/Sidebar'
import { OverviewTab }       from '@/components/OverviewTab'
import { AlertsTable }       from '@/components/AlertsTable'
import { AlertHistoryTable } from '@/components/AlertHistoryTable'
import { SensorsTab }        from '@/components/SensorsTab'
import { AlertRulesTab }     from '@/components/AlertRulesTab'
import { UsersTab }          from '@/components/UsersTab'
import { Toast }             from '@/components/Toast'

const WS_SENSOR_TYPE_MAP: Record<string, SensorReading['sensor_type']> = {
  temp: 'temperature', humidity: 'humidity', ox: 'oxygen',
}

type Tab = 'overview' | 'alerts' | 'history' | 'sensors' | 'rules' | 'users'

const NAV = [
  { id: 'overview', label: 'Overview',      icon: Activity      },
  { id: 'alerts',   label: 'Active Alerts', icon: Bell          },
  { id: 'history',  label: 'Alert History', icon: AlertTriangle },
  { id: 'sensors',  label: 'Sensors',       icon: Radio         },
  { id: 'rules',    label: 'Alert Rules',   icon: Settings, section: 'Administration' },
  { id: 'users',    label: 'Users & Roles', icon: Users          },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [tab,      setTab]      = useState<Tab>('overview')
  const [alerts,   setAlerts]   = useState<AlertsInfo[]>([])
  const [sensors,  setSensors]  = useState<SensorReading[]>([])
  const [cityAverages, setCityAverages] = useState<CityAverages>({ oxygen: null, temperature: null, humidity: null })
  const [chartData, setChartData] = useState<MetricsHistoryPoint[]>([])
  const [rules,    setRules]    = useState<AlertRule[]>([])
  const [users,    setUsers]    = useState<AccountInformation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [chartLoading,  setChartLoading]  = useState(true)
  const [rulesLoading,  setRulesLoading]  = useState(true)
  const [usersLoading,  setUsersLoading]  = useState(true)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [resolvingId,  setResolvingId]  = useState<number | null>(null)
  const [resolveNote,  setResolveNote]  = useState('')
  const [toast,        setToast]        = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const alertDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchAlerts() {
    try {
      const data = await getAlerts('active,acknowledged,resolved')
      setAlerts(data)
    } catch { setAlerts([]) }
  }

  async function fetchRules() {
    try {
      const data = await getAlertRules()
      setRules(data)
    } catch { setRules([]) }
  }

  async function fetchUsers() {
    try {
      const data = await listUsers()
      setUsers(data)
    } catch { setUsers([]) }
  }

  const handleWsMessage = useCallback((msg: { event: string; data: Record<string, unknown> }) => {
    if (msg.event !== 'sensor_update') return
    const d = msg.data
    const mapped = WS_SENSOR_TYPE_MAP[d.sensor_type as string]
    if (!mapped) return
    const newReading: SensorReading = {
      sensorid: d.sensor_id as string,
      zone: d.zone as string,
      value: d.value as number,
      timestamp: d.timestamp as string,
      sensor_type: mapped,
    }
    setSensors(prev => [newReading, ...prev])
    getCityAverages().then(setCityAverages).catch(() => {})
    if (alertDebounce.current) clearTimeout(alertDebounce.current)
    alertDebounce.current = setTimeout(() => { fetchAlerts() }, 5000)
  }, [])

  const { status: wsStatus } = useWebSocket(token, handleWsMessage)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('scemas_session')
      if (!raw) { router.push('/login'); return }
      const session: Session = JSON.parse(raw)
      if (!session.access_token || !session.user) { router.push('/login'); return }
      if (session.user.userrole !== 'admin') { router.push('/login'); return }
      setUserName(session.user.username)
      setUserRole(session.user.userrole)
      setToken(session.access_token)

      Promise.allSettled([
        getAlerts('active,acknowledged,resolved'),
        getSensors(),
        getCityAverages(),
        getMetricsHistory(),
        getAlertRules(),
        listUsers(),
      ]).then(([alertsR, sensorsR, avgR, chartR, rulesR, usersR]) => {
        if (alertsR.status === 'fulfilled')  setAlerts(alertsR.value)
        if (sensorsR.status === 'fulfilled') setSensors(sensorsR.value)
        if (avgR.status === 'fulfilled')     setCityAverages(avgR.value)
        if (chartR.status === 'fulfilled')   setChartData(chartR.value)
        if (rulesR.status === 'fulfilled')   setRules(rulesR.value)
        if (usersR.status === 'fulfilled')   setUsers(usersR.value)
        setLoading(false)
        setChartLoading(false)
        setRulesLoading(false)
        setUsersLoading(false)
      })
    } catch {
      router.push('/login')
    }
  }, [router])

  function fireToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Alert operations ──────────────────────────────────────────────────────

  async function acknowledge(id: number) {
    try {
      await acknowledgeAlert(id)
      await fetchAlerts()
    } catch { /* API error handled by client */ }
  }

  function startResolve(id: number) { setResolvingId(id); setResolveNote('') }

  async function confirmResolve(id: number) {
    try {
      await resolveAlert(id, { note: resolveNote || undefined })
      await fetchAlerts()
    } catch { /* API error handled by client */ }
    setResolvingId(null)
    setResolveNote('')
  }

  // ── Alert rule operations ─────────────────────────────────────────────────

  async function handleCreateRule(rule: CreateAlertRuleRequest) {
    try {
      await createAlertRule(rule)
      await fetchRules()
      fireToast(`Rule "${rule.name}" created`)
    } catch (err) {
      fireToast(`Failed to create rule: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function handleUpdateRule(ruleID: number, rule: UpdateAlertRuleRequest) {
    try {
      await updateAlertRule(ruleID, rule)
      await fetchRules()
      fireToast(`Rule "${rule.name}" updated`)
    } catch (err) {
      fireToast(`Failed to update rule: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function handleDeleteRule(ruleID: number) {
    try {
      await deleteAlertRule(ruleID)
      await fetchRules()
      fireToast('Rule deleted')
    } catch (err) {
      fireToast(`Failed to delete rule: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function handleToggleRule(ruleID: number) {
    try {
      await toggleAlertRule(ruleID)
      await fetchRules()
    } catch { /* toggle failed silently */ }
  }

  // ── User operations ───────────────────────────────────────────────────────

  async function handleCreateUser(user: AdminCreateAccountRequest) {
    try {
      await adminCreateUser(user)
      await fetchUsers()
      fireToast(`User "${user.username}" created`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        fireToast('A user with this email already exists.')
      } else {
        fireToast(`Failed to create user: ${msg || 'Unknown error'}`)
      }
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async function logout() {
    try { await apiLogout() } catch { /* ignore – clearing session anyway */ }
    localStorage.removeItem('scemas_session')
    router.push('/')
  }

  if (!userName) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm">
      Checking session…
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <Sidebar
        nav={NAV}
        tab={tab}
        onTabChange={t => setTab(t as Tab)}
        userName={userName}
        userRole={userRole}
        activeAlertCount={alerts.filter(a => a.status === 'active').length}
        variant="admin"
        onLogout={logout}
      />

      <div className="flex-1 overflow-auto relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' : wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
          <span className="text-gray-400">
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        {tab === 'overview' && (
          <OverviewTab
            alerts={alerts}
            chartData={chartData}
            chartLoading={chartLoading}
            activeSensorCount={new Set(sensors.map(s => s.sensorid)).size}
            onAcknowledge={acknowledge}
            onStartResolve={id => { setTab('alerts'); startResolve(id) }}
            onViewAllAlerts={() => setTab('alerts')}
          />
        )}
        {tab === 'alerts' && (
          <AlertsTable
            alerts={alerts.filter(a => a.status !== 'resolved')}
            resolvingId={resolvingId}
            resolveNote={resolveNote}
            onAcknowledge={acknowledge}
            onStartResolve={startResolve}
            onConfirmResolve={confirmResolve}
            onCancelResolve={() => setResolvingId(null)}
            onResolveNoteChange={setResolveNote}
          />
        )}
        {tab === 'history'  && <AlertHistoryTable alerts={alerts} />}
        {tab === 'sensors'  && <SensorsTab sensors={sensors} cityAverages={cityAverages} loading={loading} />}
        {tab === 'rules'    && (
          <AlertRulesTab
            rules={rules}
            onToggle={handleToggleRule}
            onDelete={handleDeleteRule}
            onCreate={handleCreateRule}
            onUpdate={handleUpdateRule}
            onFireToast={fireToast}
            loading={rulesLoading}
          />
        )}
        {tab === 'users' && (
          <UsersTab
            users={users}
            onCreateUser={handleCreateUser}
            onFireToast={fireToast}
            loading={usersLoading}
          />
        )}
      </div>

      {toast && <Toast message={toast} />}
    </div>
  )
}
