/**
 * Backend-aligned TypeScript type definitions.
 * Field names match Pydantic models exactly.
 *
 * Subsystem: Interfaces with all three subsystems: Account Management, Telemetry Data Management, Alert Rules Management
 * PAC Layer: Presentation
 * Reqs:      N/A (type contracts)
 */

// ── Enums (matching backend string enums) ───────────────────────────────────

export type Role = 'admin' | 'operator' | 'public'
export type SensorType = 'temp' | 'humidity' | 'ox'
export type AlertStatus = 'active' | 'resolved' | 'acknowledged'

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AccountInformation
}

// ── Accounts ────────────────────────────────────────────────────────────────

export interface AccountInformation {
  id: string | null
  username: string
  email: string
  phone_num: string | null
  userrole: Role
  created_at: string | null
  last_login: string | null
}

export interface CreateAccountRequest {
  username: string
  email: string
  password: string
  phone_num?: string | null
}

export interface AdminCreateAccountRequest {
  username: string
  email: string
  password: string
  phone_num?: string | null
  userrole: Role
}

export interface EditAccountRequest {
  username?: string | null
  phone_num?: string | null
  password?: string | null
}

export interface AdminEditAccountRequest {
  username?: string
  phone_num?: string
  userrole?: Role
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export interface AlertsInfo {
  alertid: number | null
  alerttype: SensorType
  status: AlertStatus
  ruleviolated: number | null
  humidity_sensor_id: number | null
  oxygen_sensor_id: number | null
  temp_sensor_id: number | null
  zone: string | null
  message: string | null
  severity: string | null
  triggered_at: string | null
  resolved_note: string | null
}

// ── Alert Rules ─────────────────────────────────────────────────────────────

export interface AlertRule {
  ruleID: number | null
  createdby: string | null
  lowerbound: number
  upperbound: number
  ruletype: SensorType
  severity: string | null
  name: string | null
  enabled: boolean | null
}

export interface CreateAlertRuleRequest {
  lowerbound: number
  upperbound: number
  ruletype: SensorType
  severity?: string | null
  name?: string | null
}

export interface UpdateAlertRuleRequest {
  lowerbound?: number | null
  upperbound?: number | null
  ruletype?: SensorType | null
  severity?: string | null
  name?: string | null
  enabled?: boolean | null
}

// ── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number | null
  timestamp: string | null
  eventtype: string
  description: string
  user_id: string | null
  humidity_sensor_id: number | null
  oxygen_sensor_id: number | null
  temp_sensor_id: number | null
}

// ── Webhooks ────────────────────────────────────────────────────────────

export interface WebhookSubscriber {
  id: number
  url: string
  description: string
  active: boolean
  created_at: string
  created_by: string | null
}

// ── Resolve Alert ───────────────────────────────────────────────────────────

export interface ResolveAlertRequest {
  note?: string | null
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// ── Sensors ─────────────────────────────────────────────────────────────────

/** Single reading returned by GET /sensors and GET /sensors/{id} */
export interface SensorReading {
  sensorid: string
  zone: string
  value: number
  timestamp: string
  sensor_type: 'temperature' | 'humidity' | 'oxygen'
}

/** GET /sensors/city-averages response (after rename fix) */
export interface CityAverages {
  oxygen: number | null
  temperature: number | null
  humidity: number | null
}

// ── Public endpoints ────────────────────────────────────────────────────────

export interface ZoneSensorData {
  value: number
  unit: string
  last_updated: string
}

export interface ZoneSummary {
  zone: string
  temperature: ZoneSensorData | null
  humidity: ZoneSensorData | null
  oxygen: ZoneSensorData | null
  status: 'online' | 'offline'
}

export interface MetricsHistoryPoint {
  time: string
  temperature: number | null
  humidity: number | null
  oxygen: number | null
}

export interface ZoneMetrics {
  zone: string
  temperature: number | null
  humidity: number | null
  oxygen: number | null
  [key: string]: string | number | null
}

export interface FiveMinAvgResponse {
  city: {
    temperature: number | null
    humidity: number | null
    oxygen: number | null
    [key: string]: number | null
  }
  zones: ZoneMetrics[]
}

export interface PublicDashboardResponse {
  zones: ZoneSummary[]
  five_min_avg: FiveMinAvgResponse
  hourly_max: ZoneMetrics[]
}

export interface ReadingsToday {
  count: number
}

// ── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  access_token: string
  user: AccountInformation
}

// ── Re-export style maps from data.ts ───────────────────────────────────────

export {
  SEVERITY_STYLES,
  STATUS_STYLES,
} from './data'
