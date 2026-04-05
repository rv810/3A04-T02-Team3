import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { CheckCircle2 } from 'lucide-react'
import type { AlertsInfo, MetricsHistoryPoint } from '@/lib/types'
import type { AlertSeverity } from '@/lib/data'
import { SEVERITY_STYLES } from '@/lib/data'
import { Badge } from './Badge'

interface Props {
  alerts: AlertsInfo[]
  chartData: MetricsHistoryPoint[]
  chartLoading: boolean
  activeSensorCount?: number
  onAcknowledge: (id: number) => void
  onStartResolve: (id: number) => void
  onViewAllAlerts: () => void
}

export function OverviewTab({ alerts, chartData, chartLoading, activeSensorCount, onAcknowledge, onStartResolve, onViewAllAlerts }: Props) {
  const active       = alerts.filter(a => a.status === 'active')
  const acknowledged = alerts.filter(a => a.status === 'acknowledged')

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Operational Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Sensors', value: activeSensorCount ?? '—', sub: 'from latest readings',        subColor: 'text-gray-500' },
          { label: 'Active Alerts',  value: active.length,           sub: `${acknowledged.length} acknowledged`, subColor: 'text-yellow-400', valueColor: active.length > 0 ? 'text-red-400' : '' },
          { label: 'Readings Today', value: '47,520',                sub: '5-second intervals',                  subColor: 'text-gray-500' },
          { label: 'System Uptime',  value: '99.8%',                 sub: 'Last 30 days',                        subColor: 'text-gray-500', valueColor: 'text-green-400' },
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
          {chartLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">Loading chart…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="time" stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280' }} interval={3} />
                <YAxis stroke="#374151" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: 12 }} />
                <Legend iconType="line" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="temperature" stroke="#F97316" strokeWidth={1.5} dot={false} name="Temp (°C)"    />
                <Line type="monotone" dataKey="humidity"    stroke="#06B6D4" strokeWidth={1.5} dot={false} name="Humidity (%)" />
                <Line type="monotone" dataKey="oxygen"      stroke="#22C55E" strokeWidth={1.5} dot={false} name="Oxygen (%)"  />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Active Alerts</h2>
          <button onClick={onViewAllAlerts} className="text-xs text-blue-400 hover:text-blue-300">View all →</button>
        </div>
        {active.length === 0 ? (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-green-400">
            <CheckCircle2 className="w-4 h-4" /> No active alerts
          </div>
        ) : (
          <div className="space-y-2">
            {active.slice(0, 3).map(a => (
              <div key={a.alertid} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <Badge className={SEVERITY_STYLES[(a.severity ?? 'low') as AlertSeverity]}>{a.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{a.message}</div>
                  <div className="text-[10px] text-gray-500">{a.alerttype} · {a.zone ?? '—'} · {a.triggered_at ? new Date(a.triggered_at).toLocaleString() : '—'}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => onAcknowledge(a.alertid!)} className="text-[10px] px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">ACK</button>
                  <button onClick={() => onStartResolve(a.alertid!)} className="text-[10px] px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors">Resolve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
