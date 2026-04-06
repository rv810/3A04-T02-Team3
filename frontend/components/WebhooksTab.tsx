/**
 * Webhook subscriber management tab for the admin dashboard.
 *
 * Subsystem: Alert Rules Management
 * PAC Layer: Presentation
 * Reqs:      OE-IA2
 */

'use client'
import { useState } from 'react'
import { Trash2, ToggleLeft, ToggleRight, Plus } from 'lucide-react'
import type { WebhookSubscriber } from '@/lib/types'

const inputCls =
  'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'

interface Props {
  webhooks: WebhookSubscriber[]
  onAdd: (data: { url: string; description: string }) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onToggle: (id: number) => Promise<void>
  onFireToast: (msg: string) => void
  loading: boolean
}

export function WebhooksTab({ webhooks, onAdd, onDelete, onToggle, onFireToast, loading }: Props) {
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) { onFireToast('URL is required'); return }
    setSubmitting(true)
    try {
      await onAdd({ url: url.trim(), description: description.trim() })
      setUrl('')
      setDescription('')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-500 text-sm">Loading external notifications...</div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">External Notifications</h2>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-400">Add Notification Endpoint</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className={`${inputCls} flex-1`}
            placeholder="https://example.com/notifications"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <input
            className={`${inputCls} flex-1`}
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </form>

      {/* Table */}
      {webhooks.length === 0 ? (
        <div className="text-gray-500 text-sm">No external notification endpoints configured.</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">URL</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Created</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map(wh => (
                <tr key={wh.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-white max-w-xs truncate">{wh.url}</td>
                  <td className="px-4 py-3 text-gray-400">{wh.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        wh.active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-gray-700/40 text-gray-500 border-gray-600/30'
                      }`}
                    >
                      {wh.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {wh.created_at ? new Date(wh.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onToggle(wh.id)}
                        className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                        title={wh.active ? 'Deactivate' : 'Activate'}
                      >
                        {wh.active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                      </button>
                      <button
                        onClick={() => onDelete(wh.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 transition-colors text-gray-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
