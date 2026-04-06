/**
 * Active/acknowledged alerts table with acknowledge and resolve actions.
 *
 * Subsystem: Alert Rules Management
 * PAC Layer: Presentation
 * Reqs:      BE3 (Acknowledge/Resolve Alert)
 */

'use client'
import { useState } from 'react'
import type { AlertsInfo } from '@/lib/types'
import type { AlertSeverity } from '@/lib/data'
import { SEVERITY_STYLES, STATUS_STYLES } from '@/lib/data'
import { Badge } from './Badge'

const PAGE_SIZE = 50

interface Props {
  alerts: AlertsInfo[]
  resolvingId: number | null
  resolveNote: string
  onAcknowledge: (id: number) => void
  onStartResolve: (id: number) => void
  onConfirmResolve: (id: number) => void
  onCancelResolve: () => void
  onResolveNoteChange: (note: string) => void
}

export function AlertsTable({ alerts, resolvingId, resolveNote, onAcknowledge, onStartResolve, onConfirmResolve, onCancelResolve, onResolveNoteChange }: Props) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE))
  const paged = alerts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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
            {paged.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600">All alerts resolved</td></tr>
            )}
            {paged.map((a, i) => (
              <tr key={a.alertid ?? i} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 font-mono font-medium">{a.temp_sensor_id ?? a.humidity_sensor_id ?? a.oxygen_sensor_id ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400">{a.zone ?? '—'}</td>
                <td className="px-4 py-3 uppercase text-gray-500">{a.alerttype}</td>
                <td className="px-4 py-3 max-w-xs">{a.message}</td>
                <td className="px-4 py-3"><Badge className={SEVERITY_STYLES[(a.severity ?? 'low') as AlertSeverity]}>{a.severity}</Badge></td>
                <td className="px-4 py-3"><Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge></td>
                <td className="px-4 py-3 text-gray-500 tabular-nums">{a.triggered_at ? new Date(a.triggered_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">
                  {resolvingId === a.alertid ? (
                    <div className="flex flex-col gap-1.5 min-w-[180px]">
                      <input
                        autoFocus
                        value={resolveNote}
                        onChange={e => onResolveNoteChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && a.alertid != null) onConfirmResolve(a.alertid) }}
                        placeholder="Resolution note (optional)"
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                      <div className="flex gap-1">
                        <button onClick={() => { if (a.alertid != null) onConfirmResolve(a.alertid) }} className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-[10px]">Confirm</button>
                        <button onClick={onCancelResolve}                    className="px-2 py-1 bg-gray-700 text-gray-400 rounded hover:bg-gray-600 text-[10px]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {a.status === 'active' && (
                        <button onClick={() => { if (a.alertid != null) onAcknowledge(a.alertid) }} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">ACK</button>
                      )}
                      <button onClick={() => { if (a.alertid != null) onStartResolve(a.alertid) }} className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors">Resolve</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {alerts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-sm text-gray-500">{alerts.length} alerts total</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page + 1 >= totalPages}
                className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
