'use client'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { User, Role } from '@/lib/data'
import { Badge } from './Badge'

const ROLE_STYLES = {
  admin:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
  operator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  public:   'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors'

interface Props {
  users: User[]
  onCreateUser: (user: User) => void
  onFireToast: (msg: string) => void
}

export function UsersTab({ users, onCreateUser, onFireToast }: Props) {
  const [showForm,  setShowForm]  = useState(false)
  const [newUser,   setNewUser]   = useState({ name: '', email: '', role: 'operator' as Role })
  const [userError, setUserError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setUserError('Name and email are required.')
      return
    }
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      setUserError('A user with this email already exists.')
      return
    }
    onCreateUser({ id: `u${Date.now()}`, name: newUser.name.trim(), email: newUser.email.trim(), role: newUser.role, status: 'active', lastLogin: 'Never' })
    setNewUser({ name: '', email: '', role: 'operator' })
    setUserError('')
    setShowForm(false)
    onFireToast(`User ${newUser.name} created`)
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
              <label className="block text-xs text-gray-400 mb-1">Full Name</label>
              <input required value={newUser.name}
                onChange={e => { setNewUser(u => ({ ...u, name: e.target.value })); setUserError('') }}
                placeholder="Jane Smith" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input required type="email" value={newUser.email}
                onChange={e => { setNewUser(u => ({ ...u, email: e.target.value })); setUserError('') }}
                placeholder="jane@city.ca" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Role</label>
              <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value as Role }))} className={inputCls}>
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
              {['Name', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3"><Badge className={ROLE_STYLES[u.role]}>{u.role}</Badge></td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${u.status === 'active' ? 'text-green-400' : 'text-gray-600'}`}>
                    ● {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 tabular-nums">{u.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}