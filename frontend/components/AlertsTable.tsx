import { Alert, SEVERITY_STYLES, STATUS_STYLES } from '@/lib/data'
import { Badge } from './Badge'

interface Props {
  alerts: Alert[]
  resolvingId: string | null
  resolveNote: string
  onAcknowledge: (id: string) => void
  onStartResolve: (id: string) => void
  onConfirmResolve: (id: string) => void
  onCancelResolve: () => void
  onResolveNoteChange: (note: string) => void
}

export function AlertsTable({ alerts, resolvingId, resolveNote, onAcknowledge, onStartResolve, onConfirmResolve, onCancelResolve, onResolveNoteChange }: Props) {
  return (
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
            {alerts.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600">All alerts resolved</td></tr>
            )}
            {alerts.map(a => (
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
                        onChange={e => onResolveNoteChange(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onConfirmResolve(a.id)}
                        placeholder="Resolution note (optional)"
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                      <div className="flex gap-1">
                        <button onClick={() => onConfirmResolve(a.id)} className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-[10px]">Confirm</button>
                        <button onClick={onCancelResolve}              className="px-2 py-1 bg-gray-700 text-gray-400 rounded hover:bg-gray-600 text-[10px]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {a.status === 'active' && (
                        <button onClick={() => onAcknowledge(a.id)} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">ACK</button>
                      )}
                      <button onClick={() => onStartResolve(a.id)} className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors">Resolve</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}