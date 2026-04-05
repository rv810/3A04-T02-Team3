'use client'
import { useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Loader2 } from 'lucide-react'
import type { AlertRule, CreateAlertRuleRequest, UpdateAlertRuleRequest, SensorType } from '@/lib/types'
import { SEVERITY_STYLES } from '@/lib/types'
import { Badge } from './Badge'

interface Props {
  rules: AlertRule[]
  onToggle: (ruleID: number) => void
  onDelete: (ruleID: number) => void
  onCreate: (rule: CreateAlertRuleRequest) => void
  onUpdate: (ruleID: number, rule: UpdateAlertRuleRequest) => void
  onFireToast: (msg: string) => void
  loading: boolean
}

const inputCls = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'

const METRIC_LABELS: Record<SensorType, string> = { temp: 'Temperature', humidity: 'Humidity', ox: 'Oxygen' }

export function AlertRulesTab({ rules, onToggle, onDelete, onCreate, onUpdate, onFireToast, loading }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [newRule, setNewRule] = useState({ name: '', ruletype: 'temp' as SensorType, lowerbound: 0, upperbound: 100, severity: 'high' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRule, setEditRule] = useState<{ name: string; ruletype: SensorType; lowerbound: number; upperbound: number; severity: string } | null>(null)

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    onCreate({
      name: newRule.name,
      ruletype: newRule.ruletype,
      lowerbound: newRule.lowerbound,
      upperbound: newRule.upperbound,
      severity: newRule.severity,
    })
    setNewRule({ name: '', ruletype: 'temp', lowerbound: 0, upperbound: 100, severity: 'high' })
    setShowForm(false)
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId === null || !editRule) return
    onUpdate(editingId, {
      name: editRule.name,
      ruletype: editRule.ruletype,
      lowerbound: editRule.lowerbound,
      upperbound: editRule.upperbound,
      severity: editRule.severity,
    })
    setEditingId(null)
    setEditRule(null)
  }

  function startEdit(r: AlertRule) {
    setEditingId(r.ruleID!)
    setEditRule({
      name: r.name ?? '',
      ruletype: r.ruletype,
      lowerbound: r.lowerbound,
      upperbound: r.upperbound,
      severity: r.severity ?? 'high',
    })
    setShowForm(false)
  }

  const MetricSelect = ({ value, onChange, cls }: { value: SensorType; onChange: (v: SensorType) => void; cls?: string }) => (
    <select value={value} onChange={e => onChange(e.target.value as SensorType)}
      className={cls ?? 'bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none'}>
      <option value="temp">Temperature</option>
      <option value="humidity">Humidity</option>
      <option value="ox">Oxygen</option>
    </select>
  )

  const SeveritySelect = ({ value, onChange, cls }: { value: string; onChange: (v: string) => void; cls?: string }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={cls ?? 'bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none'}>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
  )

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading alert rules…
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alert Rules</h1>
        <button
          onClick={() => { setShowForm(v => !v); setEditingId(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitCreate} className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-purple-300">Create Alert Rule</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Rule Name</label>
              <input required value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))}
                placeholder="e.g. High Temperature Alert" className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Metric Type</label>
              <MetricSelect value={newRule.ruletype} onChange={v => setNewRule(r => ({ ...r, ruletype: v }))} cls={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Severity</label>
              <SeveritySelect value={newRule.severity} onChange={v => setNewRule(r => ({ ...r, severity: v }))} cls={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Lower Bound</label>
              <input required type="number" step="any" value={newRule.lowerbound}
                onChange={e => setNewRule(r => ({ ...r, lowerbound: Number(e.target.value) }))} className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Upper Bound</label>
              <input required type="number" step="any" value={newRule.upperbound}
                onChange={e => setNewRule(r => ({ ...r, upperbound: Number(e.target.value) }))} className={`w-full ${inputCls}`} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">Create Rule</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              {['Rule Name', 'Metric Type', 'Range', 'Severity', 'Enabled', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              editingId === r.ruleID && editRule ? (
                <tr key={r.ruleID} className="border-b border-purple-500/20 bg-purple-500/5">
                  <td className="px-3 py-2">
                    <input value={editRule.name} onChange={e => setEditRule(x => x && ({ ...x, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500" />
                  </td>
                  <td className="px-3 py-2">
                    <MetricSelect value={editRule.ruletype} onChange={v => setEditRule(x => x && ({ ...x, ruletype: v }))} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input type="number" step="any" value={editRule.lowerbound} onChange={e => setEditRule(x => x && ({ ...x, lowerbound: Number(e.target.value) }))}
                        className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none" />
                      <span className="text-gray-500">–</span>
                      <input type="number" step="any" value={editRule.upperbound} onChange={e => setEditRule(x => x && ({ ...x, upperbound: Number(e.target.value) }))}
                        className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none" />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <SeveritySelect value={editRule.severity} onChange={v => setEditRule(x => x && ({ ...x, severity: v }))} />
                  </td>
                  <td className="px-3 py-2 text-gray-500">—</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={submitEdit} className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-[10px] text-white transition-colors">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] text-gray-300 transition-colors">Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={r.ruleID} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-gray-400">{METRIC_LABELS[r.ruletype]}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{r.lowerbound} – {r.upperbound}</td>
                  <td className="px-4 py-3">
                    {r.severity && <Badge className={SEVERITY_STYLES[r.severity as keyof typeof SEVERITY_STYLES]}>{r.severity}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onToggle(r.ruleID!)} className="flex items-center gap-1.5 transition-colors">
                      {r.enabled
                        ? <><ToggleRight className="w-5 h-5 text-green-400" /><span className="text-green-400">On</span></>
                        : <><ToggleLeft  className="w-5 h-5 text-gray-600" /><span className="text-gray-600">Off</span></>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(r)} className="p-1.5 text-gray-600 hover:text-purple-400 transition-colors rounded" aria-label="Edit rule">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(r.ruleID!)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded" aria-label="Delete rule">
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
  )
}
