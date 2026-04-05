/**
 * SVG circular gauge for real-time sensor value visualization.
 *
 * Subsystem: Telemetry Data Management
 * PAC Layer: Presentation
 * Reqs:      BE4 (Operational Dashboard)
 */

export function Gauge({ value, max, label, unit, color }: {
  value: number; max: number; label: string; unit: string; color: string
}) {
  const r = 34
  const circ = 2 * Math.PI * r
  const bgLen = circ * 0.75
  const valLen = bgLen * Math.min(value / max, 1)
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Why aria-label includes value and unit: accessibility — screen readers
          announce the measurement (e.g. "Temperature: 23.5 °C") so visually-impaired
          users get the same information. */}
      <svg viewBox="0 0 100 100" className="w-24 h-24" role="img" aria-label={`${label}: ${value}${unit}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1F2937" strokeWidth="9"
          strokeDasharray={`${bgLen} ${circ - bgLen}`} transform="rotate(135 50 50)" strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${valLen} ${circ - valLen}`} transform="rotate(135 50 50)" strokeLinecap="round" />
        <text x="50" y="46" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="16" fontWeight="bold">
          {value}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#6B7280" fontSize="9">
          {unit}
        </text>
      </svg>
      <div className="text-xs text-gray-400 text-center">{label}</div>
    </div>
  )
}

export const humidColor  = (v: number) => v < 40 || v > 70   ? '#EAB308' : '#22C55E'
export const oxygenColor = (v: number) => v >= 19 && v <= 22 ? '#22C55E' : '#EAB308'