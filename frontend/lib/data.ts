/**
 * Shared UI constants for alert severity and status styling.
 *
 * Subsystem: Consumes Alert Rules Management subsystem
 * PAC Layer: Presentation
 * Reqs:      BE1, BE4
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'

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
