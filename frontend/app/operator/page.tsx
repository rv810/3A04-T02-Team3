'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, Activity, Radio } from 'lucide-react'
import { INITIAL_ALERTS, Alert } from '@/lib/data'
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
  const [alerts,   setAlerts]   = useState<Alert[]>(INITIAL_ALERTS)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')

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
  function startResolve(id: string) { setResolvingId(id); setResolveNote('') }
  function confirmResolve(id: string) {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'resolved' as const, resolvedNote: resolveNote || undefined } : a
    ))
    setResolvingId(null)
    setResolveNote('')
  }
  function logout() { localStorage.removeItem('scemas_session'); router.push('/') }

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
        {tab === 'sensors' && <SensorsTab />}
      </div>
    </div>
  )
}
