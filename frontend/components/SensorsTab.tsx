import { SENSORS, SENSOR_STATUS_STYLES } from '@/lib/data'
import { Gauge, aqiColor, noiseColor, humidColor } from './Gauge'

export function SensorsTab() {
  const active = SENSORS.filter(s => s.status !== 'offline')
  const avg = (fn: (s: typeof SENSORS[0]) => number) =>
    Math.round(active.reduce((sum, s) => sum + fn(s), 0) / active.length)

  const cityAqi   = avg(s => s.aqi)
  const cityNoise = avg(s => s.noise)
  const cityTemp  = avg(s => s.temperature)
  const cityHumid = avg(s => s.humidity)

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold">Sensor Network</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4 text-gray-300">City-Wide Current Readings</h2>
        <div className="flex justify-around flex-wrap gap-4">
          <Gauge value={cityAqi}   max={150} label="Air Quality (AQI)"  unit="AQI" color={aqiColor(cityAqi)}    />
          <Gauge value={cityNoise} max={100} label="Noise Level"        unit="dB"  color={noiseColor(cityNoise)} />
          <Gauge value={cityTemp}  max={40}  label="Temperature"        unit="°C"  color="#F97316" />
          <Gauge value={cityHumid} max={100} label="Humidity"           unit="%"   color={humidColor(cityHumid)} />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              {['Sensor', 'Zone', 'AQI', 'Noise (dB)', 'Temp (°C)', 'Humidity (%)', 'Status', 'Last Seen'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SENSORS.map(s => (
              <tr key={s.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold">{s.name}</td>
                <td className="px-4 py-3 text-gray-400">{s.zone}</td>
                <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.aqi         : <span className="text-gray-700">—</span>}</td>
                <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.noise       : <span className="text-gray-700">—</span>}</td>
                <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.temperature : <span className="text-gray-700">—</span>}</td>
                <td className="px-4 py-3 tabular-nums">{s.status !== 'offline' ? s.humidity    : <span className="text-gray-700">—</span>}</td>
                <td className="px-4 py-3"><span className={`font-medium ${SENSOR_STATUS_STYLES[s.status]}`}>● {s.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{s.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}