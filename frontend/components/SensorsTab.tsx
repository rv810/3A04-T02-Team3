/**
 * City-wide sensor readings grid with per-sensor detail table.
 *
 * Subsystem: Telemetry Data Management
 * PAC Layer: Presentation
 * Reqs:      BE4 (Operational Dashboard)
 */

import type { SensorReading, CityAverages } from '@/lib/types'
import { Gauge, humidColor, oxygenColor } from './Gauge'

interface Props {
  sensors: SensorReading[]
  cityAverages: CityAverages
  loading: boolean
  total: number
  limit: number
  offset: number
  onPageChange: (newOffset: number) => void
}

export function SensorsTab({ sensors, cityAverages, loading, total, limit, offset, onPageChange }: Props) {
  const temp  = cityAverages.temperature ?? 0
  const humid = cityAverages.humidity ?? 0
  const oxy   = cityAverages.oxygen ?? 0

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-gray-500 text-sm">
        Loading sensor data…
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold">Sensor Network</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4 text-gray-300">City-Wide Current Readings</h2>
        <div className="flex justify-around flex-wrap gap-4">
          <Gauge value={Math.round(temp)}  max={50}  label="Temperature" unit="°C" color="#F97316" />
          <Gauge value={Math.round(humid)} max={100} label="Humidity"    unit="%"  color={humidColor(humid)} />
          <Gauge value={Math.round(oxy)}   max={25}  label="Oxygen"     unit="%"  color={oxygenColor(oxy)} />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              {['Sensor ID', 'Zone', 'Type', 'Value', 'Last Reading'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sensors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-600">
                  No sensor data
                </td>
              </tr>
            )}
            {sensors.map((s, i) => (
              <tr key={`${s.sensorid}-${s.sensor_type}-${i}`} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{s.sensorid.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-gray-400">{s.zone}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{s.sensor_type}</td>
                <td className="px-4 py-3 tabular-nums">{s.value}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(s.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-sm text-gray-500">{total} sensors total</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onPageChange(offset - limit)}
                disabled={offset === 0}
                className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => onPageChange(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
