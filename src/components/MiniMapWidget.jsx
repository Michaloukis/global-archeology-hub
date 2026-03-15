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

const WORLD_BOUNDS = L.latLngBounds([-85, -180], [85, 180])

/** Restrict view to one world and set initial view to full world */
function NoWrapBounds() {
  const map = useMap()
  useEffect(() => {
    map.setMaxBounds(WORLD_BOUNDS)
    map.options.maxBoundsViscosity = 1
    map.options.worldCopyJump = false
    map.setView([20, 0], 1, { animate: false })
  }, [map])
  return null
}

/** Once map is ready, set unzoomed world view (no fitBounds to avoid grey/tile issues) */
function FitWorldOnLoad() {
  const map = useMap()
  useEffect(() => {
        map.whenReady(() => {
      try {
        map.setView([20, 0], 1, { animate: false })
      } catch (_) {}
    })
  }, [map])
  return null
}

/** Optional: fit view to markers when 2+ sites; disabled on load so full world view shows first on refresh */
function FitBounds({ sites }) {
  return null
}

/** Unzoom (zoom out) + Reset view as Leaflet controls so they're always clickable */
function MapControls() {
  const map = useMap()
  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const el = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        el.style.display = 'flex'
        el.style.gap = '6px'
        el.style.flexDirection = 'column'
        el.innerHTML = `
          <button type="button" aria-label="Zoom out" title="Zoom out" class="minimap-unzoom-btn" style="
            display: flex; align-items: center; justify-content: center;
            width: 32px; height: 32px; border: 1px solid rgba(0,0,0,0.25);
            background: rgba(255,255,255,0.95); border-radius: 8px;
            font-size: 18px; font-weight: 600; cursor: pointer; line-height: 1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          ">−</button>
          <button type="button" aria-label="Reset to full map view" title="Reset to full map" class="minimap-reset-btn" style="
            display: flex; align-items: center; gap: 6px;
            padding: 6px 10px; min-height: 32px; border: 1px solid rgba(0,0,0,0.25);
            background: rgba(255,255,255,0.95); border-radius: 8px;
            font-size: 11px; font-weight: 500; cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Reset view
          </button>
        `
        L.DomEvent.disableClickPropagation(el)
        const unzoomBtn = el.querySelector('.minimap-unzoom-btn')
        const resetBtn = el.querySelector('.minimap-reset-btn')
        L.DomEvent.on(unzoomBtn, 'click', L.DomEvent.stop)
        L.DomEvent.on(resetBtn, 'click', L.DomEvent.stop)
        unzoomBtn.addEventListener('click', () => {
          try {
            const center = map.getCenter()
            const zoom = map.getZoom()
            if (zoom > 1) {
              map.setView(center, zoom - 1, { animate: true })
            }
          } catch (_) {}
        })
        resetBtn.addEventListener('click', () => {
          try {
            map.setView([20, 0], 1, { animate: true })
          } catch (_) {}
        })
        return el
      }
    })
    const control = new Control({ position: 'bottomleft' })
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map])
  return null
}

export default function MiniMapWidget({ profile, onOpenMap, embedded = false }) {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)

  const isChief = profile?.role === 'Director'
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
          <span className="text-[10px] font-semibold text-ink">Mini Map</span>
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
            center={[20, 0]}
            zoom={1}
            minZoom={1}
            maxZoom={18}
            scrollWheelZoom={false}
            dragging={true}
            className="h-full w-full rounded-b-lg minimap-no-zoom"
          >
            <NoWrapBounds />
            <FitWorldOnLoad />
            <FitBounds sites={sitesWithCoords} />
            <MapControls />
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
