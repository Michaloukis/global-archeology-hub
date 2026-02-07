import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../supabaseClient'

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

export default function SitesMap({ searchQuery, profile }) {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [journals, setJournals] = useState({}) // { siteId: [entries] }
  const [userRequests, setUserRequests] = useState([]) // Array of site IDs user applied for
  const [requestMessage, setRequestMessage] = useState('')
  const [experience, setExperience] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [availability, setAvailability] = useState('')
  const [activeSiteForRequest, setActiveSiteForRequest] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    fetchSites()
    fetchAllJournals()
    if (profile) fetchUserRequests()
  }, [profile])

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

      alert('EXPEDITION DOSSIER DISPATCHED. AWAITING CHIEF REVIEW.');
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

  const isFieldArch = profile?.role === 'Field Archeologist';

  async function fetchSites() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sites')
      .select('*')

    if (error) {
      console.error('Error fetching sites:', error)
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
      setSites(data || [])
    }
    setLoading(false)
  }

  const filteredSites = sites.filter(site => 
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-4 w-4 bg-black"></div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Global Site Registry</h2>
          </div>
          <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div> In Progress
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div> Finished
            </div>
          </div>
        </div>
      </div>

      <div className="border-4 border-black h-[600px] w-full relative z-0 shadow-[12px_12px_0px_rgba(0,0,0,0.1)]">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center font-black uppercase tracking-[0.5em]">
            Loading Geospatial Data...
          </div>
        )}
        <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredSites.map(site => (
            <Marker key={site.id} position={[site.lat, site.lng]}>
                  <Popup>
                    <div className="font-sans p-2 min-w-[250px] max-w-[300px]">
                      <h3 className="font-black uppercase text-lg border-b-2 border-black mb-2 leading-tight">{site.name}</h3>
                      <div className="flex flex-col gap-1 mb-3">
                        <div className={`text-[10px] font-black uppercase px-2 py-1 inline-block border border-black w-fit ${site.status === 'Finished' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {site.status}
                        </div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                          LOC: {site.lat.toFixed(4)}°N, {site.lng.toFixed(4)}°E (DD)
                        </span>
                      </div>

                      {/* Live Intel Section */}
                      {journals[site.id] && journals[site.id].length > 0 && (
                        <div className="mb-4 space-y-2 border-t-2 border-black pt-2">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 animate-pulse"></span>
                            <span className="text-[9px] font-black uppercase">Live Field Intel:</span>
                          </div>
                          
                          {journals[site.id].slice(0, 1).map(intel => (
                            <div key={intel.id} className="space-y-2">
                              {intel.image_url && (
                                <img src={intel.image_url} className="w-full h-24 object-cover border border-black grayscale hover:grayscale-0 transition-all" alt="Field evidence" />
                              )}
                              {intel.findings && (
                                <div className="bg-gray-50 p-2 border border-black text-[10px] font-bold uppercase leading-tight">
                                  <span className="text-red-600">LATEST FIND:</span> {intel.findings}
                                </div>
                              )}
                              {(profile?.role === 'Chief Archeologist' || profile?.role === 'Field Archeologist') && intel.notes && (
                                <p className="text-[9px] font-bold text-gray-500 uppercase leading-relaxed italic">
                                  "{intel.notes.substring(0, 60)}..."
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-2">
                        <button 
                          onClick={() => window.open(site.tourUrl, '_blank')}
                          className="w-full bg-black text-white text-[10px] font-black uppercase py-2 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Launch 360 Tour</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {isFieldArch && site.status !== 'Finished' && !userRequests.includes(site.id) && (
                          <button 
                            onClick={() => setActiveSiteForRequest(site)}
                            className="w-full bg-red-600 text-white text-[10px] font-black uppercase py-2 hover:bg-black transition-colors flex items-center justify-center gap-2"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredSites.length === 0 ? (
          <div className="col-span-full border-2 border-black border-dashed p-12 text-center">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest">No sites match the current search parameters.</p>
          </div>
        ) : (
          filteredSites.map(site => (
            <div key={site.id} className="border-2 border-black p-6 bg-white hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Site_{site.id.toString().padStart(3, '0')}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-1 border border-black ${site.status === 'Finished' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {site.status}
                  </span>
                </div>
                <h4 className="font-black text-xl uppercase tracking-tighter mb-4 group-hover:underline">{site.name}</h4>
                
                {/* Integrated Intel in Card */}
                {journals[site.id] && journals[site.id].length > 0 ? (
                  <div className="mb-6 p-4 bg-gray-50 border-2 border-black border-dashed">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="text-[8px] font-black uppercase">Latest Dispatch:</span>
                    </div>
                    {journals[site.id][0].image_url && (
                      <img src={journals[site.id][0].image_url} className="w-full h-24 object-cover border border-black mb-3 grayscale hover:grayscale-0 transition-all" alt="Latest finding" />
                    )}
                    <p className="text-[10px] font-black uppercase leading-tight text-black">
                      {journals[site.id][0].findings || 'SITE OBSERVATION RECORDED'}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase mb-6">
                    {site.description}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(site.tourUrl, '_blank');
                  }}
                  className="flex-1 border-2 border-black bg-white text-black text-[10px] font-black uppercase py-3 hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <span>Explore in 360°</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>

                {isFieldArch && site.status !== 'Finished' && !userRequests.includes(site.id) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSiteForRequest(site);
                    }}
                    className="flex-1 border-2 border-red-600 bg-red-600 text-white text-[10px] font-black uppercase py-3 hover:bg-black hover:border-black transition-all flex items-center justify-center gap-2"
                  >
                    Request to Join
                  </button>
                )}
              </div>
            </div>
        )))}
      </div>

      {/* Request Modal */}
      {activeSiteForRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-white border-4 border-black w-full max-w-lg shadow-[16px_16px_0px_rgba(0,0,0,1)] p-10 relative my-10">
            <button 
              onClick={() => setActiveSiteForRequest(null)}
              className="absolute top-6 right-6 font-black text-xs hover:text-red-600"
            >
              CLOSE [X]
            </button>
            
            <div className="mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Expedition Application</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Applying for: {activeSiteForRequest.name}</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Years of Field Experience</label>
                  <input
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full border-2 border-black p-3 text-xs font-bold outline-none focus:bg-gray-50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Specialization</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Pottery, Bioarchaeology"
                    className="w-full border-2 border-black p-3 text-xs font-bold uppercase outline-none focus:bg-gray-50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Availability / Timeframe</label>
                <input
                  type="text"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g. Summer 2026, Immediate"
                  className="w-full border-2 border-black p-3 text-xs font-bold uppercase outline-none focus:bg-gray-50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Cover Letter / Personal Note</label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="State why you want to join this specific dig..."
                  className="w-full h-32 border-2 border-black p-4 text-xs font-bold uppercase outline-none focus:bg-gray-50 resize-none"
                  required
                />
              </div>

              <button
                disabled={submitLoading}
                onClick={() => handleSendRequest(activeSiteForRequest)}
                className="w-full bg-black text-white py-4 text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:bg-gray-200"
              >
                {submitLoading ? 'DISPATCHING DOSSIER...' : 'Submit Professional Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

