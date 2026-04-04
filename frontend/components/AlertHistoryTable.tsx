'use client'
import { useState } from 'react'
import { Alert, SEVERITY_STYLES, STATUS_STYLES, ZONE_NAMES } from '@/lib/data'
import { Badge } from './Badge'

const selectCls = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500'

export function AlertHistoryTable({ alerts }: { alerts: Alert[] }) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all')
  const [filterZone,   setFilterZone]   = useState('all')
  const [filterDate,   setFilterDate]   = useState('')

  const filtered = alerts.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (filterZone   !== 'all' && a.zone   !== filterZone)   return false
    if (filterDate && !a.triggeredAt.startsWith(filterDate)) return false
    return true
  })

  const hasFilter = filterStatus !== 'all' || filterZone !== 'all' || filterDate

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Alert History</h1>

      <div className="flex flex-wrap gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} className={selectCls}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Zone</label>
          <select value={filterZone} onChange={e => setFilterZone(e.target.value)} className={selectCls}>
            <option value="all">All zones</option>
            {ZONE_NAMES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Date</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className={selectCls} />
        </div>
        {hasFilter && (
          <div className="flex flex-col gap-1 justify-end">
            <button
              onClick={() => { setFilterStatus('all'); setFilterZone('all'); setFilterDate('') }}
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-600">
                  No alerts match the current filters. Try adjusting your search.
                </td>
              </tr>
            )}
            {filtered.map(a => (
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
  )
}