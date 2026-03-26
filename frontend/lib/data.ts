// ── Types ────────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'operator'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'
export type SensorStatus = 'active' | 'warning' | 'offline'
export type MetricType = 'aqi' | 'noise' | 'temperature' | 'humidity'
export type RuleOperator = 'gt' | 'lt' | 'gte' | 'lte'

export interface Sensor {
  id: string
  name: string
  zone: string
  status: SensorStatus
  aqi: number
  noise: number
  temperature: number
  humidity: number
  lastSeen: string
}

export interface Alert {
  id: string
  sensorName: string
  zone: string
  metric: MetricType
  message: string
  severity: AlertSeverity
  status: AlertStatus
  triggeredAt: string
}

export interface AlertRule {
  id: string
  name: string
  metric: MetricType
  operator: RuleOperator
  threshold: number
  severity: AlertSeverity
  enabled: boolean
}

export interface User {
  id: string
  name: string
  email: string
  role: Role | 'public'
  status: 'active' | 'inactive'
  lastLogin: string
}

export interface ChartPoint {
  time: string
  aqi: number
  noise: number
  temperature: number
  humidity: number
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

export const SENSORS: Sensor[] = [
  { id: 's1',  name: 'DT-01', zone: 'Downtown Core',   status: 'active',  aqi: 48, noise: 62, temperature: 22, humidity: 58, lastSeen: '< 1 min ago' },
  { id: 's2',  name: 'DT-02', zone: 'Downtown Core',   status: 'warning', aqi: 78, noise: 74, temperature: 23, humidity: 55, lastSeen: '< 1 min ago' },
  { id: 's3',  name: 'DT-03', zone: 'Downtown Core',   status: 'active',  aqi: 42, noise: 58, temperature: 21, humidity: 60, lastSeen: '2 min ago'   },
  { id: 's4',  name: 'DT-04', zone: 'Downtown Core',   status: 'active',  aqi: 35, noise: 55, temperature: 22, humidity: 57, lastSeen: '< 1 min ago' },
  { id: 's5',  name: 'ET-01', zone: 'East District',   status: 'active',  aqi: 52, noise: 60, temperature: 21, humidity: 62, lastSeen: '< 1 min ago' },
  { id: 's6',  name: 'ET-02', zone: 'East District',   status: 'active',  aqi: 45, noise: 57, temperature: 20, humidity: 64, lastSeen: '3 min ago'   },
  { id: 's7',  name: 'ET-03', zone: 'East District',   status: 'offline', aqi: 0,  noise: 0,  temperature: 0,  humidity: 0,  lastSeen: '47 min ago'  },
  { id: 's8',  name: 'WT-01', zone: 'West District',   status: 'active',  aqi: 38, noise: 52, temperature: 23, humidity: 56, lastSeen: '< 1 min ago' },
  { id: 's9',  name: 'WT-02', zone: 'West District',   status: 'active',  aqi: 41, noise: 54, temperature: 22, humidity: 58, lastSeen: '< 1 min ago' },
  { id: 's10', name: 'WT-03', zone: 'West District',   status: 'active',  aqi: 36, noise: 50, temperature: 21, humidity: 60, lastSeen: '1 min ago'   },
  { id: 's11', name: 'IN-01', zone: 'Industrial Zone', status: 'warning', aqi: 88, noise: 82, temperature: 26, humidity: 48, lastSeen: '< 1 min ago' },
  { id: 's12', name: 'IN-02', zone: 'Industrial Zone', status: 'active',  aqi: 72, noise: 78, temperature: 25, humidity: 50, lastSeen: '2 min ago'   },
]

export const INITIAL_ALERTS: Alert[] = [
  { id: 'a1', sensorName: 'IN-01', zone: 'Industrial Zone', metric: 'noise',       message: 'Noise level exceeded 80 dB threshold (current: 82 dB)',        severity: 'high',     status: 'active',       triggeredAt: '2026-03-26 09:42' },
  { id: 'a2', sensorName: 'DT-02', zone: 'Downtown Core',   metric: 'aqi',         message: 'AQI exceeded 75 threshold (current: 78)',                       severity: 'medium',   status: 'active',       triggeredAt: '2026-03-26 09:15' },
  { id: 'a3', sensorName: 'IN-01', zone: 'Industrial Zone', metric: 'aqi',         message: 'AQI exceeded 75 threshold (current: 88)',                       severity: 'high',     status: 'acknowledged', triggeredAt: '2026-03-26 08:30' },
  { id: 'a4', sensorName: 'ET-03', zone: 'East District',   metric: 'temperature', message: 'Sensor ET-03 has gone offline — no data received for 47 min',  severity: 'medium',   status: 'active',       triggeredAt: '2026-03-26 08:05' },
  { id: 'a5', sensorName: 'DT-02', zone: 'Downtown Core',   metric: 'noise',       message: 'Noise level exceeded 70 dB threshold (current: 74 dB)',         severity: 'medium',   status: 'resolved',     triggeredAt: '2026-03-26 07:20' },
  { id: 'a6', sensorName: 'IN-02', zone: 'Industrial Zone', metric: 'noise',       message: 'Noise level exceeded 70 dB threshold (current: 78 dB)',         severity: 'medium',   status: 'resolved',     triggeredAt: '2026-03-26 06:45' },
  { id: 'a7', sensorName: 'IN-01', zone: 'Industrial Zone', metric: 'aqi',         message: 'AQI exceeded 75 threshold (current: 91)',                       severity: 'high',     status: 'resolved',     triggeredAt: '2026-03-26 05:30' },
  { id: 'a8', sensorName: 'DT-01', zone: 'Downtown Core',   metric: 'humidity',    message: 'Humidity exceeded 70% threshold (current: 74%)',                severity: 'low',      status: 'resolved',     triggeredAt: '2026-03-25 22:15' },
]

export const INITIAL_RULES: AlertRule[] = [
  { id: 'r1', name: 'High AQI Alert',           metric: 'aqi',         operator: 'gt',  threshold: 75,  severity: 'high',   enabled: true  },
  { id: 'r2', name: 'Elevated AQI Warning',      metric: 'aqi',         operator: 'gt',  threshold: 50,  severity: 'medium', enabled: true  },
  { id: 'r3', name: 'Critical Noise Level',      metric: 'noise',       operator: 'gt',  threshold: 80,  severity: 'high',   enabled: true  },
  { id: 'r4', name: 'Elevated Noise Warning',    metric: 'noise',       operator: 'gt',  threshold: 70,  severity: 'medium', enabled: true  },
  { id: 'r5', name: 'High Temperature Alert',    metric: 'temperature', operator: 'gt',  threshold: 35,  severity: 'medium', enabled: true  },
  { id: 'r6', name: 'High Humidity Alert',       metric: 'humidity',    operator: 'gt',  threshold: 70,  severity: 'low',    enabled: false },
]

export const USERS: User[] = [
  { id: 'u1', name: 'Alex Chen',       email: 'alex.chen@city.ca',    role: 'admin',    status: 'active',   lastLogin: '2026-03-26 09:01' },
  { id: 'u2', name: 'Sarah Park',      email: 'sarah.park@city.ca',   role: 'admin',    status: 'active',   lastLogin: '2026-03-25 16:30' },
  { id: 'u3', name: 'Marcus Williams', email: 'm.williams@city.ca',   role: 'operator', status: 'active',   lastLogin: '2026-03-26 08:45' },
  { id: 'u4', name: 'Priya Nair',      email: 'p.nair@city.ca',       role: 'operator', status: 'active',   lastLogin: '2026-03-26 07:15' },
  { id: 'u5', name: 'Tom Bradley',     email: 't.bradley@city.ca',    role: 'operator', status: 'inactive', lastLogin: '2026-03-20 14:00' },
]

export const CHART_DATA: ChartPoint[] = [
  { time: '00:00', aqi: 38, noise: 42, temperature: 17, humidity: 65 },
  { time: '01:00', aqi: 35, noise: 40, temperature: 17, humidity: 66 },
  { time: '02:00', aqi: 33, noise: 38, temperature: 16, humidity: 67 },
  { time: '03:00', aqi: 31, noise: 37, temperature: 16, humidity: 68 },
  { time: '04:00', aqi: 32, noise: 38, temperature: 16, humidity: 67 },
  { time: '05:00', aqi: 36, noise: 40, temperature: 17, humidity: 66 },
  { time: '06:00', aqi: 42, noise: 48, temperature: 18, humidity: 64 },
  { time: '07:00', aqi: 52, noise: 58, temperature: 19, humidity: 62 },
  { time: '08:00', aqi: 61, noise: 66, temperature: 20, humidity: 60 },
  { time: '09:00', aqi: 65, noise: 68, temperature: 21, humidity: 58 },
  { time: '10:00', aqi: 58, noise: 65, temperature: 22, humidity: 57 },
  { time: '11:00', aqi: 54, noise: 63, temperature: 23, humidity: 56 },
  { time: '12:00', aqi: 55, noise: 65, temperature: 24, humidity: 55 },
  { time: '13:00', aqi: 57, noise: 66, temperature: 24, humidity: 55 },
  { time: '14:00', aqi: 60, noise: 68, temperature: 25, humidity: 54 },
  { time: '15:00', aqi: 62, noise: 67, temperature: 25, humidity: 54 },
  { time: '16:00', aqi: 64, noise: 70, temperature: 24, humidity: 55 },
  { time: '17:00', aqi: 68, noise: 72, temperature: 23, humidity: 56 },
  { time: '18:00', aqi: 65, noise: 70, temperature: 22, humidity: 57 },
  { time: '19:00', aqi: 60, noise: 65, temperature: 21, humidity: 59 },
  { time: '20:00', aqi: 55, noise: 60, temperature: 20, humidity: 61 },
  { time: '21:00', aqi: 50, noise: 55, temperature: 19, humidity: 62 },
  { time: '22:00', aqi: 46, noise: 50, temperature: 18, humidity: 63 },
  { time: '23:00', aqi: 42, noise: 46, temperature: 18, humidity: 64 },
]

export const ZONES = [
  { name: 'Downtown Core',   sensors: 4, active: 4, avgAqi: 51, status: 'moderate' as const },
  { name: 'East District',   sensors: 3, active: 2, avgAqi: 49, status: 'moderate' as const },
  { name: 'West District',   sensors: 3, active: 3, avgAqi: 38, status: 'good'     as const },
  { name: 'Industrial Zone', sensors: 2, active: 2, avgAqi: 80, status: 'poor'     as const },
]

// Pre-computed city averages (active sensors only)
const _active = SENSORS.filter(s => s.status !== 'offline')
export const CITY_AVG = {
  aqi:         Math.round(_active.reduce((s, x) => s + x.aqi, 0) / _active.length),
  noise:       Math.round(_active.reduce((s, x) => s + x.noise, 0) / _active.length),
  temperature: Math.round(_active.reduce((s, x) => s + x.temperature, 0) / _active.length),
  humidity:    Math.round(_active.reduce((s, x) => s + x.humidity, 0) / _active.length),
}

// Shared style maps
export const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  low:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const STATUS_STYLES: Record<AlertStatus, string> = {
  active:       'bg-red-500/20 text-red-400 border-red-500/30',
  acknowledged: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  resolved:     'bg-green-500/20 text-green-400 border-green-500/30',
}

export const SENSOR_STATUS_STYLES: Record<SensorStatus, string> = {
  active:  'text-green-400',
  warning: 'text-yellow-400',
  offline: 'text-red-400',
}

export const ZONE_STATUS_STYLES = {
  good:     'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  poor:     'bg-red-500/20 text-red-400 border-red-500/30',
}
