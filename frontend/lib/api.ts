import type {
  LoginRequest,
  LoginResponse,
  AccountInformation,
  CreateAccountRequest,
  AdminCreateAccountRequest,
  AdminEditAccountRequest,
  EditAccountRequest,
  AlertsInfo,
  AlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AuditLog,
  ResolveAlertRequest,
  SensorReading,
  CityAverages,
  ZoneSummary,
  MetricsHistoryPoint,
  Session,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const SESSION_KEY = 'scemas_session'

function publicHeaders(): Record<string, string> {
  const key = process.env.NEXT_PUBLIC_API_KEY
  if (!key) return {}
  return { 'x-api-key': key }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function authHeaders(): Record<string, string> {
  const session = getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(requiresAuth ? authHeaders() : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401 && requiresAuth) {
    localStorage.removeItem(SESSION_KEY)
    window.location.href = '/login?expired=true'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }, false)
}

export async function register(data: CreateAccountRequest): Promise<AccountInformation> {
  return request<AccountInformation>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }, false)
}

export async function logout(): Promise<void> {
  await request<{ message: string }>('/auth/logout', { method: 'POST' })
}

// ── Accounts ────────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<AccountInformation> {
  return request<AccountInformation>('/accounts/me')
}

export async function editAccount(data: EditAccountRequest): Promise<AccountInformation> {
  return request<AccountInformation>('/accounts/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAccount(): Promise<void> {
  await request<{ message: string }>('/accounts/me', { method: 'DELETE' })
}

export async function listUsers(): Promise<AccountInformation[]> {
  return request<AccountInformation[]>('/accounts/users')
}

export async function adminCreateUser(data: AdminCreateAccountRequest): Promise<AccountInformation> {
  return request<AccountInformation>('/accounts/create-user', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function adminEditUser(
  userId: string,
  data: AdminEditAccountRequest,
): Promise<AccountInformation> {
  return request<AccountInformation>(`/accounts/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function adminDeleteUser(userId: string): Promise<void> {
  await request<{ message: string }>(`/accounts/users/${userId}`, {
    method: 'DELETE',
  })
}

// ── Operator: Alerts ────────────────────────────────────────────────────────

export async function getAlerts(status?: string): Promise<AlertsInfo[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<AlertsInfo[]>(`/operator/alerts${query}`)
}

export async function acknowledgeAlert(alertId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/operator/alerts/${alertId}/acknowledge`, {
    method: 'PUT',
  })
}

export async function resolveAlert(
  alertId: number,
  data?: ResolveAlertRequest,
): Promise<{ message: string; note: string }> {
  return request<{ message: string; note: string }>(
    `/operator/alerts/${alertId}/resolve`,
    { method: 'PUT', body: JSON.stringify(data ?? {}) },
  )
}

export async function getOperatorAuditLog(): Promise<AuditLog[]> {
  return request<AuditLog[]>('/operator/audit-log')
}

// ── Admin: Rules ────────────────────────────────────────────────────────────

export async function getAlertRules(): Promise<AlertRule[]> {
  return request<AlertRule[]>('/admin/rules')
}

export async function createAlertRule(data: CreateAlertRuleRequest): Promise<AlertRule> {
  return request<AlertRule>('/admin/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAlertRule(
  ruleId: number,
  data: UpdateAlertRuleRequest,
): Promise<AlertRule> {
  return request<AlertRule>(`/admin/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAlertRule(ruleId: number): Promise<void> {
  await request<void>(`/admin/rules/${ruleId}`, { method: 'DELETE' })
}

export async function toggleAlertRule(ruleId: number): Promise<AlertRule> {
  return request<AlertRule>(`/admin/rules/${ruleId}/toggle`, {
    method: 'PATCH',
  })
}

export async function getAdminAuditLog(): Promise<AuditLog[]> {
  return request<AuditLog[]>('/admin/audit-log')
}

// ── Sensors ─────────────────────────────────────────────────────────────────

export async function getSensors(zone?: string): Promise<SensorReading[]> {
  const query = zone ? `?zone=${encodeURIComponent(zone)}` : ''
  return request<SensorReading[]>(`/sensors${query}`)
}

export async function getSensor(id: string): Promise<SensorReading> {
  return request<SensorReading>(`/sensors/${encodeURIComponent(id)}`)
}

export async function getCityAverages(): Promise<CityAverages> {
  return request<CityAverages>('/sensors/city-averages')
}

export async function getReadingsToday(): Promise<{ count: number }> {
  return request<{ count: number }>('/sensors/readings-today')
}

// ── Public (no auth) ────────────────────────────────────────────────────────

export async function getZoneSummary(zone: string): Promise<ZoneSummary> {
  return request<ZoneSummary>(`/public/summary/${encodeURIComponent(zone)}`, {
    headers: publicHeaders(),
  }, false)
}

export async function getAllZones(): Promise<ZoneSummary[]> {
  return request<ZoneSummary[]>('/public/zones', { headers: publicHeaders() }, false)
}

export async function getMetricsHistory(): Promise<MetricsHistoryPoint[]> {
  return request<MetricsHistoryPoint[]>('/public/metrics/history', { headers: publicHeaders() }, false)
}
