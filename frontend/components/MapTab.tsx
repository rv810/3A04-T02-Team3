'use client'

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SensorReading, ZoneSummary } from '@/lib/types'

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const ZONE_COORDS: Record<string, [number, number]> = {
  downtown:    [43.2557, -79.8711],
  industrial:  [43.2720, -79.8280],
  residential: [43.2400, -79.8900],
  park:        [43.2700, -79.8850],
  waterfront:  [43.2690, -79.8560],
}

interface Props {
  sensors: SensorReading[]
  zones: ZoneSummary[]
}

export default function MapTab({ zones }: Props) {
  return (
    <div className="h-[calc(100vh-2rem)] w-full rounded-lg overflow-hidden">
      <MapContainer
        center={[43.2557, -79.8711]}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {zones.map((zone) => {
          const coords = ZONE_COORDS[zone.zone]
          if (!coords) return null
          const online = zone.status === 'online'
          return (
            <CircleMarker
              key={zone.zone}
              center={coords}
              radius={14}
              pathOptions={{
                color: online ? '#22c55e' : '#ef4444',
                fillColor: online ? '#22c55e' : '#ef4444',
                fillOpacity: 0.35,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <div className="font-bold text-base mb-1 capitalize">{zone.zone}</div>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {online ? 'Online' : 'Offline'}
                  </div>
                  <div className="space-y-1 text-gray-700">
                    <div>🌡️ Temperature: {zone.temperature ? `${zone.temperature.value} ${zone.temperature.unit}` : 'N/A'}</div>
                    <div>💧 Humidity: {zone.humidity ? `${zone.humidity.value} ${zone.humidity.unit}` : 'N/A'}</div>
                    <div>🫁 Oxygen: {zone.oxygen ? `${zone.oxygen.value} ${zone.oxygen.unit}` : 'N/A'}</div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
