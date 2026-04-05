/**
 * User management table with inline editing for admin dashboard.
 *
 * Subsystem: Account Management
 * PAC Layer: Presentation
 * Reqs:      BE6 (Manage Users & Roles), SR-AC3 (admin restricted)
 */

'use client'
import { useState } from 'react'
import { UserPlus, Loader2, Pencil, Trash2 } from 'lucide-react'
import type { AccountInformation, AdminCreateAccountRequest, AdminEditAccountRequest, Role } from '@/lib/types'
import { Badge } from './Badge'

const ROLE_STYLES: Record<Role, string> = {
  admin:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
  operator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  public:   'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'

interface Props {
  users: AccountInformation[]
  onCreateUser: (user: AdminCreateAccountRequest) => void
  onUpdateUser: (userId: string, data: AdminEditAccountRequest) => void
  onDeleteUser: (userId: string) => void
  onFireToast: (msg: string) => void
  loading: boolean
  currentUserId: string
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString()
}

export function UsersTab({ users, onCreateUser, onUpdateUser, onDeleteUser, onFireToast, loading, currentUserId }: Props) {
  const [showForm,  setShowForm]  = useState(false)
  const [newUser,   setNewUser]   = useState({ username: '', email: '', password: '', phone_num: '', userrole: 'operator' as Role })
  const [userError, setUserError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData,  setEditData]  = useState({ username: '', phone_num: '', userrole: 'operator' as Role })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!newUser.username.trim() || !newUser.email.trim() || !newUser.password) {
      setUserError('Username, email, and password are required.')
      return
    }
    onCreateUser({
      username: newUser.username.trim(),
      email: newUser.email.trim(),
      password: newUser.password,
      phone_num: newUser.phone_num.trim() || undefined,
      userrole: newUser.userrole,
    })
    setNewUser({ username: '', email: '', password: '', phone_num: '', userrole: 'operator' })
    setUserError('')
    setShowForm(false)
  }

  function startEdit(u: AccountInformation) {
    setEditingId(u.id)
    setEditData({ username: u.username, phone_num: u.phone_num || '', userrole: u.userrole })
  }

  function submitEdit() {
    if (!editingId) return
    onUpdateUser(editingId, {
      username: editData.username.trim() || undefined,
      phone_num: editData.phone_num.trim() || undefined,
      userrole: editData.userrole,
    })
    setEditingId(null)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Users & Roles</h1>
        <button
          onClick={() => { setShowForm(v => !v); setUserError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" /> New User
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-purple-300">Create User Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Username</label>
              <input required value={newUser.username}
                onChange={e => { setNewUser(u => ({ ...u, username: e.target.value })); setUserError('') }}
                placeholder="Jane Smith" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input required type="email" value={newUser.email}
                onChange={e => { setNewUser(u => ({ ...u, email: e.target.value })); setUserError('') }}
                placeholder="jane@city.ca" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input required type="password" value={newUser.password}
                onChange={e => { setNewUser(u => ({ ...u, password: e.target.value })); setUserError('') }}
                placeholder="Minimum 8 characters" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone (optional)</label>
              <input value={newUser.phone_num}
                onChange={e => setNewUser(u => ({ ...u, phone_num: e.target.value }))}
                placeholder="+1 555-0123" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Role</label>
              <select value={newUser.userrole} onChange={e => setNewUser(u => ({ ...u, userrole: e.target.value as Role }))} className={inputCls}>
                <option value="operator">City Operator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          {userError && <p className="text-xs text-red-400">{userError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">Create User</button>
            <button type="button" onClick={() => { setShowForm(false); setUserError('') }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              {['Username', 'Email', 'Role', 'Last Login', 'Created At', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              editingId === u.id ? (
                <tr key={u.id} className="border-b border-purple-500/20 bg-purple-500/5">
                  <td className="px-3 py-2">
                    <input value={editData.username} onChange={e => setEditData(d => ({ ...d, username: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500" />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-3 py-2">
                    <select value={editData.userrole} onChange={e => setEditData(d => ({ ...d, userrole: e.target.value as Role }))}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500">
                      <option value="operator">operator</option>
                      <option value="admin">admin</option>
                      <option value="public">public</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{formatDate(u.last_login)}</td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{formatDate(u.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={submitEdit} className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-[10px] text-white transition-colors">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] text-gray-300 transition-colors">Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3"><Badge className={ROLE_STYLES[u.userrole]}>{u.userrole}</Badge></td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{formatDate(u.last_login)}</td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    {u.id !== currentUserId ? (
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(u)} className="p-1.5 text-gray-600 hover:text-purple-400 transition-colors rounded" aria-label="Edit user">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (window.confirm(`Delete user "${u.username}"?`)) onDeleteUser(u.id!) }}
                          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded" aria-label="Delete user">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600">You</span>
                    )}
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
