'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, Activity, Radio, Settings, Users } from 'lucide-react'
import { INITIAL_ALERTS, INITIAL_RULES, USERS, Alert, AlertRule, User } from '@/lib/data'
import { Sidebar }           from '@/components/Sidebar'
import { OverviewTab }       from '@/components/OverviewTab'
import { AlertsTable }       from '@/components/AlertsTable'
import { AlertHistoryTable } from '@/components/AlertHistoryTable'
import { SensorsTab }        from '@/components/SensorsTab'
import { AlertRulesTab }     from '@/components/AlertRulesTab'
import { UsersTab }          from '@/components/UsersTab'
import { Toast }             from '@/components/Toast'

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
  const [alerts,   setAlerts]   = useState<Alert[]>(INITIAL_ALERTS)
  const [rules,    setRules]    = useState<AlertRule[]>(INITIAL_RULES)
  const [users,    setUsers]    = useState<User[]>([...USERS])
  const [userName, setUserName] = useState('')
  const [resolvingId,  setResolvingId]  = useState<string | null>(null)
  const [resolveNote,  setResolveNote]  = useState('')
  const [toast,        setToast]        = useState<string | null>(null)

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

  const activeAlerts = alerts.filter(a => a.status !== 'resolved')

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <Sidebar
        nav={NAV}
        tab={tab}
        onTabChange={t => setTab(t as Tab)}
        userName={userName}
        userRole="Administrator"
        activeAlertCount={alerts.filter(a => a.status === 'active').length}
        variant="admin"
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
            alerts={activeAlerts}
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
        {tab === 'sensors'  && <SensorsTab />}
        {tab === 'rules'    && (
          <AlertRulesTab
            rules={rules}
            onToggle={id => setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))}
            onDelete={id => setRules(prev => prev.filter(r => r.id !== id))}
            onCreate={rule => setRules(prev => [...prev, rule])}
            onUpdate={rule => setRules(prev => prev.map(r => r.id === rule.id ? rule : r))}
            onFireToast={fireToast}
          />
        )}
        {tab === 'users' && (
          <UsersTab
            users={users}
            onCreateUser={user => setUsers(prev => [...prev, user])}
            onFireToast={fireToast}
          />
        )}
      </div>

      {toast && <Toast message={toast} />}
    </div>
  )
}
