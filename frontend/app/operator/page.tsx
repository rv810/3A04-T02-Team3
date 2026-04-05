'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, Activity, Radio } from 'lucide-react'
import { logout as apiLogout, getAlerts, acknowledgeAlert, resolveAlert, getSensors, getCityAverages, getMetricsHistory } from '@/lib/api'
import type { Session, AlertsInfo, SensorReading, CityAverages, MetricsHistoryPoint } from '@/lib/types'
import { useWebSocket } from '@/lib/useWebSocket'
import { Sidebar }           from '@/components/Sidebar'
import { OverviewTab }       from '@/components/OverviewTab'
import { AlertsTable }       from '@/components/AlertsTable'
import { AlertHistoryTable } from '@/components/AlertHistoryTable'
import { SensorsTab }        from '@/components/SensorsTab'

const WS_SENSOR_TYPE_MAP: Record<string, SensorReading['sensor_type']> = {
  temp: 'temperature', humidity: 'humidity', ox: 'oxygen',
}

type Tab = 'overview' | 'alerts' | 'history' | 'sensors'

const NAV = [
  { id: 'overview', label: 'Overview',      icon: Activity      },
  { id: 'alerts',   label: 'Active Alerts', icon: Bell          },
  { id: 'history',  label: 'Alert History', icon: AlertTriangle },
  { id: 'sensors',  label: 'Sensors',       icon: Radio         },
]

export default function OperatorDashboard() {
  const router = useRouter()
  const [tab,      setTab]      = useState<Tab>('overview')
  const [alerts,   setAlerts]   = useState<AlertsInfo[]>([])
  const [sensors,  setSensors]  = useState<SensorReading[]>([])
  const [cityAverages, setCityAverages] = useState<CityAverages>({ oxygen: null, temperature: null, humidity: null })
  const [chartData, setChartData] = useState<MetricsHistoryPoint[]>([])
  const [loading,      setLoading]      = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const alertDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchAlerts() {
    try {
      const data = await getAlerts('active,acknowledged,resolved')
      setAlerts(data)
    } catch {
      setAlerts([])
    }
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
    // Debounce alert re-fetch: 5s after last sensor update
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
      const role = session.user.userrole
      if (role !== 'admin' && role !== 'operator') { router.push('/login'); return }
      setUserName(session.user.username)
      setUserRole(role)
      setToken(session.access_token)

      // Fetch all data in parallel
      Promise.allSettled([
        getAlerts('active,acknowledged,resolved'),
        getSensors(),
        getCityAverages(),
        getMetricsHistory(),
      ]).then(([alertsResult, sensorsResult, avgResult, chartResult]) => {
        if (alertsResult.status === 'fulfilled')  setAlerts(alertsResult.value)
        if (sensorsResult.status === 'fulfilled') setSensors(sensorsResult.value)
        if (avgResult.status === 'fulfilled')     setCityAverages(avgResult.value)
        if (chartResult.status === 'fulfilled')   setChartData(chartResult.value)
        setLoading(false)
        setChartLoading(false)
      })
    } catch {
      router.push('/login')
    }
  }, [router])

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
        variant="operator"
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
            activeSensorCount={sensors.length}
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
        {tab === 'history' && <AlertHistoryTable alerts={alerts} />}
        {tab === 'sensors' && <SensorsTab sensors={sensors} cityAverages={cityAverages} loading={loading} />}
      </div>
    </div>
  )
}
