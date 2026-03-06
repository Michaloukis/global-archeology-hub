import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../supabaseClient'
import { isDirector, isFieldArcheologist, isArcheologist as isArcheologistRole } from '../utils/roles'

// Single-world bounds: no zoom out past this, no pan outside
const WORLD_BOUNDS = L.latLngBounds([-85, -180], [85, 180])
const MAX_ZOOM = 20

// Region bounds for "tap country" zoom + filter (same as filter dropdown)
const REGION_BOUNDS_MAP = {
  europe: L.latLngBounds([35, -11], [72, 48]),
  americas: L.latLngBounds([-56, -170], [72, -30]),
  asia_pacific: L.latLngBounds([-52, 60], [72, 180]),
  africa: L.latLngBounds([-35, -18], [38, 52]),
  middle_east: L.latLngBounds([12, 26], [43, 75])
}

const FALLBACK_MIN_ZOOM = 1

/** Bounds with the same aspect ratio as the container so the map fills the frame (no grey). */
function getBoundsMatchingContainerAspect(map) {
  const size = map.getSize()
  if (!size || size.x <= 0 || size.y <= 0) return WORLD_BOUNDS
  const aspect = size.x / size.y
  const worldAspect = 360 / 170
  let south, north, west, east
  if (aspect >= worldAspect) {
    const latSpan = 360 / aspect
    south = -latSpan / 2
    north = latSpan / 2
    west = -180
    east = 180
  } else {
    const lngSpan = 170 * aspect
    south = -85
    north = 85
    west = -lngSpan / 2
    east = lngSpan / 2
  }
  return L.latLngBounds([south, west], [north, east])
}

/** Zoom at which aspect-matched bounds fit the container (map fills frame, no grey). */
function getWorldFitZoom(map) {
  const size = map.getSize()
  if (!size || size.x <= 0 || size.y <= 0) return FALLBACK_MIN_ZOOM
  try {
    const bounds = getBoundsMatchingContainerAspect(map)
    const z = map.getBoundsZoom(bounds, false, [0, 0])
    if (typeof z !== 'number' || !Number.isFinite(z)) return FALLBACK_MIN_ZOOM
    return Math.max(FALLBACK_MIN_ZOOM, Math.min(MAX_ZOOM, z))
  } catch {
    return FALLBACK_MIN_ZOOM
  }
}

function MapBoundsEnforcer({ filterRegion }) {
  const map = useMap()
  const isRegionLock = filterRegion && filterRegion !== 'all' && REGION_BOUNDS_MAP[filterRegion]

  useEffect(() => {
    const effectiveBounds = isRegionLock ? REGION_BOUNDS_MAP[filterRegion] : WORLD_BOUNDS
    map.setMaxBounds(effectiveBounds)
    map.setMaxZoom(MAX_ZOOM)
    map.options.maxBoundsViscosity = 1
    map.options.worldCopyJump = false

    const getMinZoom = () => {
      try {
        const size = map.getSize()
        if (!size || size.x <= 0 || size.y <= 0) return FALLBACK_MIN_ZOOM
        const z = map.getBoundsZoom(effectiveBounds, false, [0, 0])
        if (typeof z !== 'number' || !Number.isFinite(z)) return FALLBACK_MIN_ZOOM
        const capped = Math.max(FALLBACK_MIN_ZOOM, Math.min(MAX_ZOOM, z))
        if (isRegionLock) return Math.min(capped, 12)
        return capped
      } catch {
        return FALLBACK_MIN_ZOOM
      }
    }

    const applyFit = () => {
      const fitZoom = getMinZoom()
      map.setMinZoom(fitZoom)
      const z = map.getZoom()
      if (z < fitZoom) map.setZoom(fitZoom)
      if (z > MAX_ZOOM) map.setZoom(MAX_ZOOM)
    }

    const keepViewInsideBounds = () => {
      const fitZoom = getMinZoom()
      map.setMinZoom(fitZoom)
      const z = map.getZoom()
      if (z < fitZoom) map.setZoom(fitZoom)
      if (z > MAX_ZOOM) map.setZoom(MAX_ZOOM)
    }

    map.whenReady(() => {
      if (map.getSize().x > 0 && map.getSize().y > 0 && !isRegionLock) {
        map.fitBounds(getBoundsMatchingContainerAspect(map), { padding: [0, 0], animate: false })
      }
      applyFit()
    })

    map.on('resize', applyFit)
    map.on('zoomend', keepViewInsideBounds)
    map.on('moveend', keepViewInsideBounds)

    return () => {
      map.off('resize', applyFit)
      map.off('zoomend', keepViewInsideBounds)
      map.off('moveend', keepViewInsideBounds)
    }
  }, [map, filterRegion, isRegionLock])
  return null
}

/** When filterRegion changes, fly the map to that region or back to world. */
function MapRegionView({ filterRegion }) {
  const map = useMap()
  useEffect(() => {
    const run = () => {
      try {
        const size = map.getSize && map.getSize()
        if (!size || (size.x <= 0 && size.y <= 0)) return
        if (filterRegion === 'all') {
          const bounds = getBoundsMatchingContainerAspect(map)
          map.fitBounds(bounds, { padding: [0, 0], animate: true })
        } else if (REGION_BOUNDS_MAP[filterRegion]) {
          if (typeof map.flyToBounds === 'function') {
            map.flyToBounds(REGION_BOUNDS_MAP[filterRegion], { padding: [24, 24], maxZoom: 14, duration: 0.6 })
          } else {
            map.fitBounds(REGION_BOUNDS_MAP[filterRegion], { padding: [24, 24], maxZoom: 14, animate: true })
          }
        }
      } catch (_) {
        // Map not ready or getSize failed
      }
    }
    if (map.whenReady) {
      map.whenReady(run)
    } else {
      run()
    }
  }, [map, filterRegion])
  return null
}

// Fix for default marker icons in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

const ArtifactIcon = L.divIcon({
  className: 'artifact-marker',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#f43f5e;border:2px solid rgba(44,40,37,0.3);box-shadow:0 1px 4px rgba(44,40,37,0.2);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
})

const VISIBILITY = { private: 'private', team: 'team', student: 'student', public: 'public' }

function siteVisibility(site) {
  return site?.visibility || (site?.is_public === false ? 'private' : 'public')
}

function journalVisibility(entry) {
  return entry?.visibility || (entry?.is_public === false ? 'private' : 'public')
}

export default function SitesMap({ searchQuery, profile }) {
  const [sites, setSites] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [journals, setJournals] = useState({})
  const [userRequests, setUserRequests] = useState([])
  const [requestMessage, setRequestMessage] = useState('')
  const [experience, setExperience] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [availability, setAvailability] = useState('')
  const [activeSiteForRequest, setActiveSiteForRequest] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [mapMode, setMapMode] = useState('public') // 'public' | 'exclusive' | 'student'
  const [filterSource, setFilterSource] = useState('all') // all | public | team | chief | my_expeditions
  const [filterType, setFilterType] = useState('both') // sites | artifacts | both
  const [filterStatus, setFilterStatus] = useState('all') // all | In Progress | Finished
  const [filterTour, setFilterTour] = useState('all') // all | with_tour | no_tour (sites)
  const [filterRegion, setFilterRegion] = useState('all') // all | europe | americas | asia_pacific | africa | middle_east
  const [showFilters, setShowFilters] = useState(false)

  const [approvedSiteIds, setApprovedSiteIds] = useState([])
  const isChief = isDirector(profile)
  const isFieldArch = isFieldArcheologist(profile)
  const isArcheologist = isArcheologistRole(profile)
  const isStudent = profile?.role === 'Student'

  useEffect(() => {
    fetchSites()
    fetchAllJournals()
    if (profile) fetchUserRequests()
    if (isStudent && mapMode === 'student') fetchStudentArtifacts()
    else if (isStudent) setArtifacts([])
  }, [profile, mapMode])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        const bounds = {
          europe: { south: 35, north: 72, west: -11, east: 48 },
          americas: { south: -56, north: 72, west: -170, east: -30 },
          asia_pacific: { south: -52, north: 72, west: 60, east: 180 },
          africa: { south: -35, north: 38, west: -18, east: 52 },
          middle_east: { south: 12, north: 43, west: 26, east: 75 },
        }
        for (const [region, b] of Object.entries(bounds)) {
          if (lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east) {
            setFilterRegion(region)
            break
          }
        }
      },
      () => {}
    )
  }, [])

  /** Public + student visibility artifact finds (for Public Map and Student Map). */
  async function fetchPublicArtifacts() {
    try {
      const data = await getPublicArtifactsData()
      setArtifacts(data)
    } catch (err) {
      console.error('Error fetching public/student artifacts:', err)
      setArtifacts([])
    }
  }

  async function fetchStudentArtifacts() {
    return fetchPublicArtifacts()
  }


  async function fetchUserRequests() {
    try {
      const { data, error } = await supabase
        .from('Registry')
        .select('site_id')
        .eq('field_arch_id', profile.id);

      if (error) throw error;
      setUserRequests(data.map(r => r.site_id));
    } catch (error) {
      console.error('Error fetching user requests:', error);
    }
  }

  async function fetchAllJournals() {
    try {
      const { data, error } = await supabase
        .from('site_journals')
        .select('*')
        .or('visibility.eq.public,visibility.eq.student,is_public.eq.true')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group journals by siteId
      const grouped = data.reduce((acc, entry) => {
        if (!acc[entry.site_id]) acc[entry.site_id] = [];
        acc[entry.site_id].push(entry);
        return acc;
      }, {});
      setJournals(grouped);
    } catch (error) {
      console.error('Error fetching journals for map:', error);
    }
  }

  async function handleSendRequest(site) {
    if (!profile) return;
    setSubmitLoading(true);
    
    try {
      const { error } = await supabase
        .from('Registry')
        .insert([{
          site_id: site.id,
          field_arch_id: profile.id,
          chief_arch_id: site.created_by,
          message: requestMessage,
          experience_years: parseInt(experience),
          specialization: specialization,
          availability: availability,
          status: 'Pending'
        }]);

      if (error) throw error;

      alert('EXPEDITION DOSSIER DISPATCHED. AWAITING DIRECTOR REVIEW.');
      fetchUserRequests(); // Refresh the list of sites user has applied for
      setActiveSiteForRequest(null);
      setRequestMessage('');
      setExperience('');
      setSpecialization('');
      setAvailability('');
    } catch (error) {
      console.error('Error sending request:', error);
      alert('ERROR DISPATCHING REQUEST: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  }

  function getSiteSourceLabel(site) {
    const vis = siteVisibility(site)
    if (vis === 'public') return 'Public'
    if (vis === 'student') return 'Student'
    if (vis === 'team') return 'Team'
    if (isChief && site.created_by === profile?.id) return 'Director only'
    if (isFieldArch && approvedSiteIds.includes(site.id)) return 'Your expedition'
    return 'Team'
  }

  function getArtifactSourceLabel(art) {
    const vis = journalVisibility(art)
    if (vis === 'public') return 'Public'
    if (vis === 'student') return 'Student'
    if (vis === 'team') return 'Team'
    if (art.user_id === profile?.id) return 'Field (yours)'
    return 'Private'
  }

  /** Returns public/student artifact rows (no state). */
  async function getPublicArtifactsData() {
    const { data, error } = await supabase
      .from('site_journals')
      .select('id, site_id, user_id, findings, notes, lat, lng, visibility, is_public, created_at, sites(name)')
      .or('visibility.eq.public,visibility.eq.student')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async function fetchArtifacts(siteIds) {
    if (!profile?.id) return
    try {
      let query = supabase
        .from('site_journals')
        .select('id, site_id, user_id, findings, notes, lat, lng, visibility, is_public, created_at, sites(name)')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
      if (isChief && siteIds?.length > 0) query = query.in('site_id', siteIds)
      else if (isFieldArch) query = query.eq('user_id', profile.id)
      else { setArtifacts([]); return }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setArtifacts(data || [])
    } catch (err) {
      console.error('Error fetching artifacts:', err)
      setArtifacts([])
    }
  }

  /** Load public + exclusive artifacts for Exclusive Map (no overwrite). */
  async function fetchExclusiveArtifactsWithPublic(siteIds) {
    if (!profile?.id) return
    try {
      const [publicData, exclusiveRes] = await Promise.all([
        getPublicArtifactsData().catch(() => []),
        (async () => {
          let query = supabase
            .from('site_journals')
            .select('id, site_id, user_id, findings, notes, lat, lng, visibility, is_public, created_at, sites(name)')
            .not('lat', 'is', null)
            .not('lng', 'is', null)
          if (isChief && siteIds?.length > 0) query = query.in('site_id', siteIds)
          else if (isFieldArch) query = query.eq('user_id', profile.id)
          else return []
          const { data, error } = await query.order('created_at', { ascending: false })
          if (error) throw error
          return data || []
        })()
      ])
      const byId = new Map()
      publicData.forEach(a => byId.set(a.id, a))
      exclusiveRes.forEach(a => byId.set(a.id, a))
      setArtifacts([...byId.values()])
    } catch (err) {
      console.error('Error fetching exclusive+public artifacts:', err)
      setArtifacts([])
    }
  }

  async function fetchSites() {
    setLoading(true)
    if (!(isStudent && mapMode === 'student') && !(isArcheologist && mapMode === 'exclusive')) setArtifacts([])
    let data = []
    let error = null
    const publicOnly = mapMode === 'public' || mapMode === 'student' || !isArcheologist
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
      // Exclusive = everything on Public (public + student) + team + chief's own
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
      setApprovedSiteIds(siteIds)
      // Exclusive = everything on Public (public + student) + team + approved expeditions
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

    // Ensure every site has coordinates so they show on the map (fallback if DB has null lat/lng)
    const withCoords = (list) => (list || []).map(s => {
      if (typeof s?.lat === 'number' && typeof s?.lng === 'number') return s
      const id = Number(s?.id) || 0
      return { ...s, lat: 15 + (id % 35) - 5, lng: (id * 37) % 360 - 180 }
    })

    if (error) {
      console.error('Error fetching sites:', error)
      if (mapMode === 'public') fetchPublicArtifacts()
      // Fallback mock data only if there's an error (like table missing)
      setSites([
        { 
          id: 1, 
          name: "Giza Plateau", 
          lat: 29.9792, 
          lng: 31.1342, 
          status: "Finished", 
          description: "Home to the Great Pyramid of Giza and the Great Sphinx. Constructed around 2560 BCE as a tomb for the Pharaoh Khufu. It remained the tallest man-made structure in the world for over 3,800 years.",
          tourUrl: "https://artsandculture.google.com/project/giza-pyramids"
        },
        { 
          id: 2, 
          name: "Acropolis of Athens", 
          lat: 37.9715, 
          lng: 23.7257, 
          status: "Finished", 
          description: "An ancient citadel located on a rocky outcrop above the city of Athens, containing the remains of several ancient buildings of great architectural and historic significance, the most famous being the Parthenon.",
          tourUrl: "https://www.acropolis-virtualtour.gr/"
        },
        { 
          id: 3, 
          name: "Machu Picchu", 
          lat: -13.1631, 
          lng: -72.5450, 
          status: "In Progress", 
          description: "A 15th-century Inca citadel located in the Eastern Cordillera of southern Peru on a 2,430-meter mountain ridge. Often referred to as the 'Lost City of the Incas'.",
          tourUrl: "https://www.youvisit.com/tour/machupicchu"
        },
        { 
          id: 4, 
          name: "Petra", 
          lat: 30.3285, 
          lng: 35.4444, 
          status: "In Progress", 
          description: "Originally known to its inhabitants as Raqmu, Petra is a historic and archaeological city in southern Jordan. Famous for its rock-cut architecture and water conduit system.",
          tourUrl: "https://www.google.com/maps/about/behind-the-scenes/streetview/treks/petra/"
        },
        { 
          id: 5, 
          name: "Chichen Itza", 
          lat: 20.6843, 
          lng: -88.5678, 
          status: "Finished", 
          description: "A large pre-Columbian city built by the Maya people of the Terminal Classic period. The site is located in Tinúm Municipality, Yucatán State, Mexico.",
          tourUrl: "https://artsandculture.google.com/story/chich%C3%A9n-itz%C3%A1-the-city-of-the-water-sorcerers/VwUxk3mD5u5mLA"
        },
        { 
          id: 6, 
          name: "Angkor Wat", 
          lat: 13.4125, 
          lng: 103.8670, 
          status: "In Progress", 
          description: "A temple complex in Cambodia and the largest religious monument in the world by land area, on a site measuring 162.6 hectares. Originally constructed as a Hindu temple for the Khmer Empire.",
          tourUrl: "https://www.google.com/maps/about/behind-the-scenes/streetview/treks/angkor/"
        },
        { 
          id: 7, 
          name: "Pompeii", 
          lat: 40.7489, 
          lng: 14.4842, 
          status: "In Progress", 
          description: "A Roman city in southern Italy that was buried under 4 to 6 meters of volcanic ash and pumice in the eruption of Mount Vesuvius in AD 79.",
          tourUrl: "https://www.google.com/maps/about/behind-the-scenes/streetview/treks/pompeii/"
        },
        { 
          id: 8, 
          name: "Tikal", 
          lat: 17.2223, 
          lng: -89.6237, 
          status: "Finished", 
          description: "The ruin of an ancient city, which was likely to have been called Yax Mutal, found in a rainforest in Guatemala. It is one of the largest archaeological sites and urban centers of the pre-Columbian Maya civilization.",
          tourUrl: "https://artsandculture.google.com/story/tikal-guatemala/0wURp_lG9I-qLQ"
        }
      ])
    } else {
      const list = data && data.length > 0 ? data : (publicOnly ? getFallbackSites() : [])
      setSites(withCoords(list))
      if (isArcheologist && mapMode === 'exclusive' && profile?.id) fetchExclusiveArtifactsWithPublic(isChief ? (data || []).map(s => s.id) : null)
      else if (mapMode === 'public') fetchPublicArtifacts()
    }
    setLoading(false)
  }

  function getFallbackSites() {
    return [
      { id: 1, name: 'Giza Plateau', lat: 29.9792, lng: 31.1342, status: 'Finished', description: 'Home to the Great Pyramid of Giza and the Great Sphinx.', tourUrl: 'https://artsandculture.google.com/project/giza-pyramids', visibility: 'public' },
      { id: 2, name: 'Acropolis of Athens', lat: 37.9715, lng: 23.7257, status: 'Finished', description: 'Ancient citadel with the Parthenon.', tourUrl: 'https://www.acropolis-virtualtour.gr/', visibility: 'public' },
      { id: 3, name: 'Stonehenge', lat: 51.1789, lng: -1.8262, status: 'Finished', description: 'Prehistoric monument in Wiltshire, England.', tourUrl: 'https://www.english-heritage.org.uk/visit/places/stonehenge/', visibility: 'public' }
    ]
  }

  const REGION_BOUNDS = {
    europe: { south: 35, north: 72, west: -11, east: 48 },
    americas: { south: -56, north: 72, west: -170, east: -30 },
    asia_pacific: { south: -52, north: 72, west: 60, east: 180 },
    africa: { south: -35, north: 38, west: -18, east: 52 },
    middle_east: { south: 12, north: 43, west: 26, east: 75 }
  }
  const inRegion = (lat, lng, regionKey) => {
    if (!regionKey || regionKey === 'all') return true
    const r = REGION_BOUNDS[regionKey]
    if (!r) return true
    return lat >= r.south && lat <= r.north && lng >= r.west && lng <= r.east
  }

  const regionLabel = {
    europe: 'Europe',
    americas: 'Americas',
    asia_pacific: 'Asia & Pacific',
    africa: 'Africa',
    middle_east: 'Middle East'
  }

  const sitesWithCoords = sites.filter(site => typeof site?.lat === 'number' && typeof site?.lng === 'number')
  const searchMatch = (site) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (site.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  const sourceMatch = (site) => {
    if (filterSource === 'all') return true
    const vis = siteVisibility(site)
    if (filterSource === 'public') return vis === 'public'
    if (filterSource === 'students') return vis === 'public' || vis === 'student'
    if (filterSource === 'student_only') return vis === 'student'
    if (filterSource === 'team') return vis === 'team'
    if (filterSource === 'chief') return isChief && site.created_by === profile?.id && vis === 'private'
    if (filterSource === 'my_expeditions') return isFieldArch && approvedSiteIds.includes(site.id)
    return true
  }
  const statusMatch = (site) => filterStatus === 'all' || site.status === filterStatus
  const tourMatch = (site) => {
    if (filterTour === 'all') return true
    const hasTour = !!(site?.tourUrl && String(site.tourUrl).trim())
    if (filterTour === 'with_tour') return hasTour
    if (filterTour === 'no_tour') return !hasTour
    return true
  }
  const regionMatch = (lat, lng) => inRegion(lat, lng, filterRegion)
  const filteredSites = sitesWithCoords.filter(site => {
    if (mapMode === 'public' && siteVisibility(site) !== 'public') return false
    return searchMatch(site) && sourceMatch(site) && statusMatch(site) && tourMatch(site) && regionMatch(site.lat, site.lng)
  })
  const filteredArtifacts = artifacts.filter(art => {
    if (filterType === 'sites') return false
    const vis = journalVisibility(art)
    if (mapMode === 'public' && vis !== 'public') return false
    if (filterSource === 'public' && vis !== 'public') return false
    if (filterSource === 'students' && vis !== 'public' && vis !== 'student') return false
    if (filterSource === 'student_only' && vis !== 'student') return false
    if (filterSource === 'team' && vis !== 'team') return false
    if (filterSource === 'chief') return false
    if (filterSource === 'my_expeditions' && art.user_id !== profile?.id) return false
    if (typeof art?.lat === 'number' && typeof art?.lng === 'number' && !regionMatch(art.lat, art.lng)) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-ink">Global Site Registry</h2>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-ink/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Finished</span>
              </div>
              {(isArcheologist || (isStudent && mapMode === 'student')) && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 border border-ink/20"></div>
                  <span>Artifact / Find</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map mode + Filters */}
        <div className="rounded-2xl border border-ink/20 bg-white shadow-[0_2px_12px_rgba(44,40,37,0.08)] p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-ink/70">View:</span>
            {isArcheologist ? (
              <div className="flex rounded-xl overflow-hidden border border-ink/20">
                <button
                  type="button"
                  onClick={() => { setMapMode('public'); setFilterSource('all') }}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${mapMode === 'public' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-ink/5'}`}
                >
                  Public Map
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode('exclusive')}
                  className={`px-4 py-2.5 text-sm font-medium border-l border-ink/20 transition-colors ${mapMode === 'exclusive' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-ink/5'}`}
                >
                  Exclusive Map
                </button>
              </div>
            ) : isStudent ? (
              <div className="flex rounded-xl overflow-hidden border border-ink/20">
                <button
                  type="button"
                  onClick={() => { setMapMode('public'); setFilterSource('all') }}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${mapMode === 'public' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-ink/5'}`}
                >
                  Public Map
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode('student')}
                  className={`px-4 py-2.5 text-sm font-medium border-l border-ink/20 transition-colors ${mapMode === 'student' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-ink/5'}`}
                >
                  Student Map
                </button>
              </div>
            ) : (
              <span className="text-sm font-medium text-ink bg-ink/10 px-3 py-1.5 rounded-lg">Public Map</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-ink text-white border-ink' : 'border-ink/20 text-ink hover:bg-ink/5'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {((mapMode !== 'public' && filterSource !== 'all') || filterType !== 'both' || filterStatus !== 'all' || filterTour !== 'all' || filterRegion !== 'all') && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/30 text-xs font-bold leading-none">
                  {[(mapMode !== 'public' && filterSource !== 'all'), filterType !== 'both', filterStatus !== 'all', filterTour !== 'all', filterRegion !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>
            {showFilters && (
              <>
                {mapMode !== 'public' && (
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="rounded-xl border border-ink/20 px-3 py-2 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                  >
                    <option value="all">All sources</option>
                    <option value="students">Students (public + student)</option>
                    <option value="student_only">Student only</option>
                    <option value="team">Team only</option>
                    {isChief && <option value="chief">Director only</option>}
                    {isFieldArch && <option value="my_expeditions">My expeditions</option>}
                  </select>
                )}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-xl border border-ink/20 px-3 py-2 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                >
                  <option value="both">Sites & Artifacts</option>
                  <option value="sites">Sites only</option>
                  <option value="artifacts">Artifacts only</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border border-ink/20 px-3 py-2 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                >
                  <option value="all">All statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Finished">Finished</option>
                </select>
                <select
                  value={filterTour}
                  onChange={(e) => setFilterTour(e.target.value)}
                  className="rounded-xl border border-ink/20 px-3 py-2 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                >
                  <option value="all">All sites</option>
                  <option value="with_tour">With 360° tour</option>
                  <option value="no_tour">Without 360° tour</option>
                </select>
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="rounded-xl border border-ink/20 px-3 py-2 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                >
                  <option value="all">All regions</option>
                  <option value="europe">Europe</option>
                  <option value="americas">Americas</option>
                  <option value="asia_pacific">Asia & Pacific</option>
                  <option value="africa">Africa</option>
                  <option value="middle_east">Middle East</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border border-ink/20 h-[600px] w-full relative z-0 overflow-hidden shadow-[0_2px_12px_rgba(44,40,37,0.08)] [&_.leaflet-container]:!rounded-2xl [&_.leaflet-container]:!h-full [&_.leaflet-container]:!w-full [&_.leaflet-container]:!m-0 [&_.leaflet-container]:!p-0 [&_.leaflet-container_.leaflet-map-pane]:!inset-0 [&_.leaflet-container_.leaflet-tile-pane]:!inset-0"
        style={{ boxSizing: 'border-box' }}
      >
        {loading && (
          <div className="absolute inset-0 bg-[#f8f3e8]/90 z-10 flex items-center justify-center text-ink font-medium">
            Loading geospatial data…
          </div>
        )}
        {filterRegion !== 'all' && (
          <button
            type="button"
            onClick={() => setFilterRegion('all')}
            className="absolute top-3 right-3 z-[11] bg-ink text-white rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V8m0-4.414l-2-2M12 8V4a2 2 0 00-2-2H6a2 2 0 00-2 2v4" />
            </svg>
            Show full map
          </button>
        )}
        <div className="absolute inset-0">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={1}
            maxZoom={MAX_ZOOM}
            maxBounds={WORLD_BOUNDS}
            maxBoundsViscosity={1}
            worldCopyJump={false}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
          <MapBoundsEnforcer filterRegion={filterRegion} />
          <MapRegionView filterRegion={filterRegion} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            noWrap={true}
          />
          {filterType !== 'sites' && filteredArtifacts.filter(art => typeof art?.lat === 'number' && typeof art?.lng === 'number').map(art => (
            <Marker key={`art-${art.id}`} position={[art.lat, art.lng]} icon={ArtifactIcon}>
              <Popup>
                <div className="font-sans p-3 min-w-[200px] text-[#2c2825]">
                  <span className="text-[10px] font-semibold text-rose-600 block mb-1">Artifact / Find</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border border-[#2c2825]/20 w-fit block mb-2 ${getArtifactSourceLabel(art) === 'Public' ? 'bg-emerald-50 text-emerald-800' : getArtifactSourceLabel(art) === 'Student' ? 'bg-indigo-50 text-indigo-800' : getArtifactSourceLabel(art) === 'Team' ? 'bg-amber-50 text-amber-800' : 'bg-[#f8f3e8] text-[#2c2825]'}`}>
                    {getArtifactSourceLabel(art)}
                  </span>
                  <span className="text-xs font-medium text-[#2c2825] block">{art.findings || art.notes?.slice(0, 50) || 'Recorded'}</span>
                  <span className="text-[10px] text-[#2c2825]/60 block mt-1">{art.sites?.name} · {new Date(art.created_at).toLocaleDateString()}</span>
                  <span className="text-[10px] text-[#2c2825]/50 block mt-0.5">LOC: {Number(art.lat).toFixed(4)}°, {Number(art.lng).toFixed(4)}°</span>
                </div>
              </Popup>
            </Marker>
          ))}
          {filterType !== 'artifacts' && filteredSites.map(site => (
            <Marker key={site.id} position={[site.lat, site.lng]}>
                  <Popup>
                    <div className="font-sans p-3 min-w-[250px] max-w-[300px] text-[#2c2825]">
                      <h3 className="font-bold text-base border-b border-[#2c2825]/20 pb-2 mb-2 leading-tight">{site.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border border-[#2c2825]/20 ${getSiteSourceLabel(site) === 'Public' ? 'bg-emerald-50 text-emerald-800' : getSiteSourceLabel(site) === 'Student' ? 'bg-indigo-50 text-indigo-800' : getSiteSourceLabel(site) === 'Team' ? 'bg-amber-50 text-amber-800' : getSiteSourceLabel(site) === 'Director only' ? 'bg-rose-50 text-rose-800' : 'bg-indigo-50 text-indigo-800'}`}>
                          {getSiteSourceLabel(site)}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border border-[#2c2825]/20 ${site.status === 'Finished' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                          {site.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#2c2825]/50 block mb-3">
                        LOC: {site.lat.toFixed(4)}°N, {site.lng.toFixed(4)}°E
                      </span>

                      {/* Live Intel Section */}
                      {journals[site.id] && journals[site.id].length > 0 && (
                        <div className="mb-3 space-y-2 border-t border-[#2c2825]/20 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-semibold">Live Field Intel</span>
                          </div>
                          {journals[site.id].slice(0, 1).map(intel => (
                            <div key={intel.id} className="space-y-2">
                              {intel.image_url && (
                                <img src={intel.image_url} className="w-full h-24 object-cover rounded border border-[#2c2825]/20 grayscale hover:grayscale-0 transition-all" alt="Field evidence" />
                              )}
                              {intel.findings && (
                                <div className="bg-[#f8f3e8] p-2 rounded border border-[#2c2825]/20 text-[10px] font-medium leading-tight">
                                  <span className="text-rose-600">Latest find:</span> {intel.findings}
                                </div>
                              )}
                              {(profile?.role === 'Director' || profile?.role === 'Field Archeologist') && intel.notes && (
                                <p className="text-[10px] text-[#2c2825]/60 leading-relaxed italic">
                                  "{intel.notes.substring(0, 60)}..."
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-2">
                        <button 
                          onClick={() => site.tourUrl && window.open(site.tourUrl, '_blank')}
                          className="w-full bg-[#2c2825] text-white text-xs font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          <span>Launch 360° Tour</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {isFieldArch && site.status !== 'Finished' && !userRequests.includes(site.id) && (
                          <button 
                            onClick={() => setActiveSiteForRequest(site)}
                            className="w-full bg-rose-500 text-white text-xs font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
                          >
                            Request to Join
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
            </Marker>
          ))}
          </MapContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredSites.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-ink/20 border-dashed bg-white/60 p-8 md:p-6 text-center">
            <p className="text-sm text-ink/60">No sites match the current filters.</p>
          </div>
        ) : (
          filteredSites.map(site => (
            <div key={site.id} className={`aspect-square md:aspect-[4/3] rounded-xl border bg-white shadow-[0_2px_10px_rgba(44,40,37,0.07)] hover:shadow-[0_4px_18px_rgba(44,40,37,0.12)] transition-shadow flex flex-col overflow-hidden ${site.status === 'Finished' ? 'border-emerald-200' : 'border-amber-200'}`}>
              <div className={`h-0.5 md:h-1 w-full shrink-0 ${site.status === 'Finished' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <div className="flex flex-col flex-1 p-3 gap-1.5 min-h-0 overflow-hidden">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <p className="text-[9px] md:text-[10px] font-medium text-ink/40 mb-0.5 tracking-wide uppercase">Site #{site.id.toString().padStart(3, '0')}</p>
                    <h4 className="font-bold text-xs md:text-sm text-ink leading-snug line-clamp-1">{site.name}</h4>
                  </div>
                  <span className={`text-[9px] md:text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${site.status === 'Finished' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {site.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] md:text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getSiteSourceLabel(site) === 'Public' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : getSiteSourceLabel(site) === 'Student' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : getSiteSourceLabel(site) === 'Team' ? 'bg-amber-50 text-amber-700 border-amber-200' : getSiteSourceLabel(site) === 'Director only' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-ink/10 text-ink border-ink/20'}`}>
                    {getSiteSourceLabel(site)}
                  </span>
                  <span className="text-[9px] md:text-[10px] text-ink/35 font-mono">{site.lat.toFixed(3)}°, {site.lng.toFixed(3)}°</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {journals[site.id]?.length > 0 ? (
                    <div className="h-full flex flex-col gap-1 p-2 rounded-lg bg-[#f8f3e8] border border-ink/10 overflow-hidden">
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-rose-500 rounded-full animate-pulse shrink-0" />
                        <span className="text-[9px] md:text-[10px] font-semibold text-ink/60">Latest</span>
                      </div>
                      {journals[site.id][0].image_url && (
                        <img src={journals[site.id][0].image_url} className="w-full h-10 md:h-12 object-cover rounded border border-ink/10 shrink-0 grayscale hover:grayscale-0 transition-all" alt="Latest finding" />
                      )}
                      <p className="text-[10px] md:text-[11px] text-ink leading-snug line-clamp-2 md:line-clamp-3">
                        {journals[site.id][0].findings || 'Site observation recorded'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] md:text-xs text-ink/55 leading-snug line-clamp-3 md:line-clamp-4">
                      {site.description || 'No description available.'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (site.tourUrl) window.open(site.tourUrl, '_blank') }}
                    className="flex-1 rounded-lg border border-ink/20 bg-white text-ink text-[10px] md:text-[11px] font-medium py-1.5 md:py-2 hover:bg-ink/5 transition-colors flex items-center justify-center gap-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    360°
                  </button>
                  {isFieldArch && site.status !== 'Finished' && !userRequests.includes(site.id) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveSiteForRequest(site) }}
                      className="flex-1 rounded-lg bg-rose-500 text-white text-[10px] md:text-[11px] font-medium py-1.5 md:py-2 hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Request Modal */}
      {activeSiteForRequest && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[150] flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-ink/20 w-full max-w-lg shadow-[0_8px_32px_rgba(44,40,37,0.15)] p-8 relative my-10">
            <button
              type="button"
              onClick={() => setActiveSiteForRequest(null)}
              className="absolute top-5 right-5 text-ink/60 hover:text-ink text-sm font-medium"
              aria-label="Close"
            >
              Close
            </button>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-ink">Expedition Application</h3>
              <p className="text-sm text-ink/60 mt-1">Applying for: {activeSiteForRequest.name}</p>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Years of field experience</label>
                  <input
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full rounded-xl border border-ink/20 p-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink">Specialization</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Pottery, Bioarchaeology"
                    className="w-full rounded-xl border border-ink/20 p-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Availability / timeframe</label>
                <input
                  type="text"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g. Summer 2026, Immediate"
                  className="w-full rounded-xl border border-ink/20 p-3 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Cover letter / personal note</label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="State why you want to join this specific dig…"
                  className="w-full h-32 rounded-xl border border-ink/20 p-4 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20 resize-none"
                  required
                />
              </div>
              <button
                type="button"
                disabled={submitLoading}
                onClick={() => handleSendRequest(activeSiteForRequest)}
                className="w-full rounded-xl bg-ink text-white py-3.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLoading ? 'Submitting…' : 'Submit application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

