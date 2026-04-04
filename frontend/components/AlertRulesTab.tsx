'use client'
import { useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'
import { AlertRule, MetricType, RuleOperator, AlertSeverity, SEVERITY_STYLES, ZONE_NAMES } from '@/lib/data'
import { Badge } from './Badge'

interface Props {
  rules: AlertRule[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onCreate: (rule: AlertRule) => void
  onUpdate: (rule: AlertRule) => void
  onFireToast: (msg: string) => void
}

const EMPTY: Omit<AlertRule, 'id'> = {
  name: '', metric: 'aqi', operator: 'gt', threshold: 75, severity: 'high', enabled: true, zone: '',
}

const inputCls = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'
const operatorFmt = (op: RuleOperator) => ({ gt: '>', lt: '<', gte: '≥', lte: '≤' }[op])
const metricUnit  = (m: MetricType)    => ({ aqi: 'AQI', noise: 'dB', temperature: '°C', humidity: '%' }[m])

export function AlertRulesTab({ rules, onToggle, onDelete, onCreate, onUpdate, onFireToast }: Props) {
  const [showForm,      setShowForm]      = useState(false)
  const [newRule,       setNewRule]       = useState({ ...EMPTY })
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [editRule,      setEditRule]      = useState<AlertRule | null>(null)

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    onCreate({ ...newRule, id: `r${Date.now()}` })
    setNewRule({ ...EMPTY })
    setShowForm(false)
    onFireToast(`Rule "${newRule.name}" created`)
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editRule) return
    onUpdate(editRule)
    setEditingId(null)
    setEditRule(null)
    onFireToast(`Rule "${editRule.name}" updated`)
  }

  function startEdit(r: AlertRule) {
    setEditingId(r.id)
    setEditRule({ ...r })
    setShowForm(false)
  }

  const MetricSelect = ({ value, onChange }: { value: MetricType; onChange: (v: MetricType) => void }) => (
    <select value={value} onChange={e => onChange(e.target.value as MetricType)}
      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none">
      <option value="aqi">AQI</option>
      <option value="noise">Noise</option>
      <option value="temperature">Temp</option>
      <option value="humidity">Humidity</option>
    </select>
  )

  const SeveritySelect = ({ value, onChange }: { value: AlertSeverity; onChange: (v: AlertSeverity) => void }) => (
    <select value={value} onChange={e => onChange(e.target.value as AlertSeverity)}
      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none">
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
  )

  const ZoneSelect = ({ value, onChange, cls }: { value: string; onChange: (v: string) => void; cls: string }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
      <option value="">All Zones</option>
      {ZONE_NAMES.map(z => <option key={z} value={z}>{z}</option>)}
    </select>
  )

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
                placeholder="e.g. High AQI Alert" className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Metric</label>
              <select value={newRule.metric} onChange={e => setNewRule(r => ({ ...r, metric: e.target.value as MetricType }))} className={`w-full ${inputCls}`}>
                <option value="aqi">AQI</option><option value="noise">Noise (dB)</option>
                <option value="temperature">Temperature (°C)</option><option value="humidity">Humidity (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Condition</label>
              <select value={newRule.operator} onChange={e => setNewRule(r => ({ ...r, operator: e.target.value as RuleOperator }))} className={`w-full ${inputCls}`}>
                <option value="gt">Greater than (&gt;)</option><option value="gte">Greater or equal (≥)</option>
                <option value="lt">Less than (&lt;)</option><option value="lte">Less or equal (≤)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Threshold</label>
              <input required type="number" value={newRule.threshold}
                onChange={e => setNewRule(r => ({ ...r, threshold: Number(e.target.value) }))} className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Severity</label>
              <select value={newRule.severity} onChange={e => setNewRule(r => ({ ...r, severity: e.target.value as AlertSeverity }))} className={`w-full ${inputCls}`}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Zone</label>
              <ZoneSelect value={newRule.zone ?? ''} onChange={v => setNewRule(r => ({ ...r, zone: v }))} cls={`w-full ${inputCls}`} />
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
              {['Rule Name', 'Metric', 'Condition', 'Zone', 'Severity', 'Enabled', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              editingId === r.id && editRule ? (
                <tr key={r.id} className="border-b border-purple-500/20 bg-purple-500/5">
                  <td className="px-3 py-2">
                    <input value={editRule.name} onChange={e => setEditRule(x => x && ({ ...x, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500" />
                  </td>
                  <td className="px-3 py-2"><MetricSelect value={editRule.metric} onChange={v => setEditRule(x => x && ({ ...x, metric: v }))} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <select value={editRule.operator} onChange={e => setEditRule(x => x && ({ ...x, operator: e.target.value as RuleOperator }))}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none">
                        <option value="gt">&gt;</option><option value="gte">≥</option>
                        <option value="lt">&lt;</option><option value="lte">≤</option>
                      </select>
                      <input type="number" value={editRule.threshold} onChange={e => setEditRule(x => x && ({ ...x, threshold: Number(e.target.value) }))}
                        className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none" />
                    </div>
                  </td>
                  <td className="px-3 py-2"><ZoneSelect value={editRule.zone ?? ''} onChange={v => setEditRule(x => x && ({ ...x, zone: v }))} cls="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none" /></td>
                  <td className="px-3 py-2"><SeveritySelect value={editRule.severity} onChange={v => setEditRule(x => x && ({ ...x, severity: v }))} /></td>
                  <td className="px-3 py-2 text-gray-500">—</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={submitEdit} className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-[10px] text-white transition-colors">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] text-gray-300 transition-colors">Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={r.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 uppercase text-gray-400">{r.metric}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{operatorFmt(r.operator)} {r.threshold} {metricUnit(r.metric)}</td>
                  <td className="px-4 py-3 text-gray-400">{r.zone || <span className="text-gray-600">All Zones</span>}</td>
                  <td className="px-4 py-3"><Badge className={SEVERITY_STYLES[r.severity]}>{r.severity}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => onToggle(r.id)} className="flex items-center gap-1.5 transition-colors">
                      {r.enabled
                        ? <><ToggleRight className="w-5 h-5 text-green-400" /><span className="text-green-400">On</span></>
                        : <><ToggleLeft  className="w-5 h-5 text-gray-600" /><span className="text-gray-600">Off</span></>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(r)} className="p-1.5 text-gray-600 hover:text-purple-400 transition-colors rounded">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(r.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded">
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