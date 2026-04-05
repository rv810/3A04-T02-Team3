'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Wind, Shield, Cpu, Globe } from 'lucide-react'
import { login as apiLogin } from '@/lib/api'
import type { Session } from '@/lib/types'

const DEMO_ACCOUNTS = [
  {
    email: 'admin@scemas.ca',
    password: 'admin123',
    role: 'admin' as const,
    name: 'Alex Chen',
    label: 'System Administrator',
    description: 'Full access: alert rules, user management, all dashboards',
    icon: Shield,
    color: 'border-purple-500/40 hover:border-purple-400',
    iconColor: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    email: 'operator@scemas.ca',
    password: 'operator123',
    role: 'operator' as const,
    name: 'Marcus Williams',
    label: 'City Operator',
    description: 'Monitor sensors, acknowledge & resolve alerts, view dashboards',
    icon: Cpu,
    color: 'border-blue-500/40 hover:border-blue-400',
    iconColor: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setError('Your session has expired. Please sign in again.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await apiLogin({ email, password })
      const session: Session = { access_token: res.access_token, user: res.user }
      localStorage.setItem('scemas_session', JSON.stringify(session))
      const dest = res.user.userrole === 'admin' ? '/admin'
                 : res.user.userrole === 'operator' ? '/operator'
                 : '/'
      router.push(dest)
    } catch (err: unknown) {
      setSubmitting(false)
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  async function quickLogin(account: typeof DEMO_ACCOUNTS[0]) {
    setError('')
    setSubmitting(true)
    try {
      const res = await apiLogin({ email: account.email, password: account.password })
      const session: Session = { access_token: res.access_token, user: res.user }
      localStorage.setItem('scemas_session', JSON.stringify(session))
      const dest = res.user.userrole === 'admin' ? '/admin'
                 : res.user.userrole === 'operator' ? '/operator'
                 : '/'
      router.push(dest)
    } catch (err: unknown) {
      setSubmitting(false)
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <Wind className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-xl font-bold tracking-tight">SCEMAS</div>
          <div className="text-xs text-gray-500">Smart City Environmental Monitoring</div>
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Login form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h1 className="text-lg font-semibold mb-1">Staff Portal Login</h1>
          <p className="text-sm text-gray-500 mb-5">Sign in with your city credentials</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@city.ca"
                disabled={submitting}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                disabled={submitting}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Quick Demo Access */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">Quick Demo Access</p>
          <div className="space-y-3">
            {DEMO_ACCOUNTS.map(account => {
              const Icon = account.icon
              return (
                <button
                  key={account.role}
                  onClick={() => quickLogin(account)}
                  disabled={submitting}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-gray-800/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${account.color}`}
                >
                  <div className={`w-10 h-10 rounded-lg ${account.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${account.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{account.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{account.description}</div>
                    <div className="text-xs text-gray-600 mt-1">{account.email}</div>
                  </div>
                </button>
              )
            })}

            <Link
              href="/"
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 bg-gray-800/50 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <div className="text-sm font-medium">Public Dashboard</div>
                <div className="text-xs text-gray-500 mt-0.5">View public environmental data — no login required</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
