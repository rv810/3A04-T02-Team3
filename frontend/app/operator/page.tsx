'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, Activity, Radio } from 'lucide-react'
import { logout as apiLogout, getAlerts, acknowledgeAlert, resolveAlert, getSensors, getCityAverages, getMetricsHistory } from '@/lib/api'
import type { Session, AlertsInfo, SensorReading, CityAverages, MetricsHistoryPoint } from '@/lib/types'
import { Sidebar }           from '@/components/Sidebar'
import { OverviewTab }       from '@/components/OverviewTab'
import { AlertsTable }       from '@/components/AlertsTable'
import { AlertHistoryTable } from '@/components/AlertHistoryTable'
import { SensorsTab }        from '@/components/SensorsTab'

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

  async function fetchAlerts() {
    try {
      const data = await getAlerts('active,acknowledged,resolved')
      setAlerts(data)
    } catch {
      setAlerts([])
    }
  }

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

      <div className="flex-1 overflow-auto">
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
