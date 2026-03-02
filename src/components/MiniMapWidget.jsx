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

function siteVisibility(site) {
  return site?.visibility || (site?.is_public === false ? 'private' : 'public')
}

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

  const isChief = profile?.role === 'Chief Archeologist'
  const isFieldArch = profile?.role === 'Field Archeologist'
  const isArcheologist = isChief || isFieldArch
  const isStudent = profile?.role === 'Student'

  useEffect(() => {
    let cancelled = false
    async function fetchSites() {
      try {
        if (!supabase) {
          if (!cancelled) setSites(DEFAULT_SITES)
          if (!cancelled) setLoading(false)
          return
        }
        let data = []
        let error = null
        const publicOnly = !isChief && !isFieldArch
        if (publicOnly) {
          const res = await supabase.from('sites').select('*')
          data = (res.data || []).filter(s => {
            const v = siteVisibility(s)
            if (v === 'public') return true
            if (v === 'student') return isStudent || isArcheologist
            return false
          })
          error = res.error
        } else if (isChief && profile?.id) {
          const [publicRes, exclusiveRes] = await Promise.all([
            supabase.from('sites').select('*'),
            supabase.from('sites').select('*').or('is_public.eq.true,created_by.eq.' + profile.id)
          ])
          const publicData = (publicRes.data || []).filter(s => {
            const v = siteVisibility(s)
            return v === 'public' || (v === 'student' && isArcheologist)
          })
          const exclusiveData = (exclusiveRes.data || []).filter(s => siteVisibility(s) === 'team' || s.created_by === profile.id)
          const byId = new Map()
          publicData.forEach(s => byId.set(s.id, s))
          exclusiveData.forEach(s => byId.set(s.id, s))
          data = [...byId.values()]
          error = publicRes.error || exclusiveRes.error
        } else if (isFieldArch && profile?.id) {
          const { data: reg } = await supabase.from('Registry').select('site_id').eq('field_arch_id', profile.id).eq('status', 'Approved')
          const siteIds = [...new Set((reg || []).map(r => r.site_id).filter(Boolean))]
          const [allRes, privateRes] = await Promise.all([
            supabase.from('sites').select('*'),
            siteIds.length > 0 ? supabase.from('sites').select('*').in('id', siteIds) : { data: [] }
          ])
          const byId = new Map()
          ;(allRes.data || []).filter(s => {
            const v = siteVisibility(s)
            return v === 'public' || (v === 'student' && isArcheologist) || v === 'team'
          }).forEach(s => { byId.set(s.id, s) })
          ;(privateRes.data || []).forEach(s => { byId.set(s.id, s) })
          data = [...byId.values()]
          error = allRes.error || privateRes.error
        } else {
          const res = await supabase.from('sites').select('*')
          data = (res.data || []).filter(s => siteVisibility(s) === 'public')
          error = res.error
        }
        const withCoords = (list) => (list || []).map(s => {
          if (typeof s?.lat === 'number' && typeof s?.lng === 'number') return s
          const id = Number(s?.id) || 0
          return { ...s, lat: 15 + (id % 35) - 5, lng: (id * 37) % 360 - 180 }
        })
        if (error) {
          if (!cancelled) setSites(DEFAULT_SITES)
        } else {
          if (!cancelled) setSites(data.length ? withCoords(data) : DEFAULT_SITES)
        }
      } catch (_) {
        if (!cancelled) setSites(DEFAULT_SITES)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSites()
    return () => { cancelled = true }
  }, [profile?.id, profile?.role])

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
