import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../supabaseClient'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

const DEFAULT_SITES = [
  { id: 1, name: 'Giza Plateau', lat: 29.9792, lng: 31.1342, status: 'Finished' },
  { id: 2, name: 'Acropolis of Athens', lat: 37.9715, lng: 23.7257, status: 'Finished' },
  { id: 3, name: 'Machu Picchu', lat: -13.1631, lng: -72.545, status: 'In Progress' },
  { id: 4, name: 'Petra', lat: 30.3285, lng: 35.4444, status: 'In Progress' },
]

function FitBounds({ sites }) {
  const map = useMap()
  useEffect(() => {
    if (!sites || sites.length < 2) return
    const withCoords = sites.filter(s => typeof s?.lat === 'number' && typeof s?.lng === 'number')
    if (withCoords.length < 2) return
    try {
      const bounds = L.latLngBounds(withCoords.map(s => [s.lat, s.lng]))
      map.fitBounds(bounds, { padding: [16, 16], maxZoom: 10 })
    } catch (_) {}
  }, [map, sites])
  return null
}

export default function MiniMapWidget({ profile, onOpenMap, embedded = false }) {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchSites() {
      try {
        if (!supabase) {
          if (!cancelled) setSites(DEFAULT_SITES)
          if (!cancelled) setLoading(false)
          return
        }
        const res = await supabase.from('sites').select('id,name,lat,lng,status,visibility,is_public')
        const data = (res.data || []).filter(s => {
          const hasCoords = typeof s?.lat === 'number' && typeof s?.lng === 'number'
          if (!hasCoords) return false
          const vis = s?.visibility ?? (s?.is_public === false ? 'private' : 'public')
          if (vis === 'public') return true
          if (vis === 'student') return profile?.role === 'Student' || profile?.role === 'Chief Archeologist' || profile?.role === 'Field Archeologist'
          return false
        })
        if (!cancelled) setSites(data.length ? data : DEFAULT_SITES)
      } catch (_) {
        if (!cancelled) setSites(DEFAULT_SITES)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSites()
    return () => { cancelled = true }
  }, [profile?.role])

  const sitesWithCoords = (sites.length ? sites : DEFAULT_SITES).filter(
    s => typeof s?.lat === 'number' && typeof s?.lng === 'number'
  )

  return (
    <div className={`h-full flex flex-col min-h-0 overflow-hidden ${embedded ? 'rounded-none' : 'rounded-lg'}`}>
      {!embedded && (
        <div className="flex items-center justify-between px-2 py-1 border-b border-ink/20 shrink-0">
          <span className="text-[10px] font-semibold text-ink">Dig sites</span>
          {onOpenMap && (
            <button
              type="button"
              onClick={onOpenMap}
              className="text-[9px] font-medium text-ink/80 hover:text-ink hover:underline"
            >
              View full map →
            </button>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-ink/50 text-xs">Loading…</div>
        ) : (
          <MapContainer
            center={sitesWithCoords.length ? [sitesWithCoords[0].lat, sitesWithCoords[0].lng] : [20, 0]}
            zoom={2}
            scrollWheelZoom={false}
            dragging={true}
            className="h-full w-full rounded-b-lg minimap-no-zoom"
          >
            <FitBounds sites={sitesWithCoords} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {sitesWithCoords.map(site => (
              <Marker key={site.id} position={[site.lat, site.lng]}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">{site.name}</p>
                    <p className="text-[10px] text-gray-500">{site.status || '—'}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  )
}
