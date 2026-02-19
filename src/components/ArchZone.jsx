import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ArchZone = ({ profile }) => {
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [isCompassOpen, setIsCompassOpen] = useState(false);
  const [isSiteFormOpen, setIsSiteFormOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [note, setNote] = useState(localStorage.getItem('arch_note') || '');
  
  // Compass State
  const [heading, setHeading] = useState(0);
  const [hasOrientation, setHasOrientation] = useState(false);
  const [compassError, setCompassError] = useState('');
  
  // Requests State
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  
  // Active Expeditions (for Field Archeologists)
  const [activeExpeditions, setActiveExpeditions] = useState([]);
  const [activeExpeditionsLoading, setActiveExpeditionsLoading] = useState(false);
  
  // Site Form State
  const [siteName, setSiteName] = useState('');
  const [siteLat, setSiteLat] = useState('');
  const [siteLng, setSiteLng] = useState('');
  const [siteDesc, setSiteDesc] = useState('');
  const [siteTour, setSiteTour] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // #region agent log
  const logData = (msg, data, hypothesisId) => {
    fetch('http://127.0.0.1:7243/ingest/681b1f5c-17b9-4cf5-8463-2a620377b7c6',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({location:'ArchZone.jsx',message:msg,data,timestamp:Date.now(),sessionId:'debug-session',hypothesisId})
    }).catch(()=>{});
  };
  // #endregion

  useEffect(() => {
    logData('ArchZone mounted', { role: profile?.role }, 'A');
    if (profile?.role === 'Chief Archeologist') {
      fetchRequests();
    } else if (profile?.role === 'Field Archeologist') {
      fetchActiveExpeditions();
    }
  }, [profile]);

  async function fetchActiveExpeditions() {
    setActiveExpeditionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('Registry')
        .select(`
          site_id,
          sites (*)
        `)
        .eq('field_arch_id', profile.id)
        .eq('status', 'Approved');

      if (error) throw error;
      setActiveExpeditions(data || []);
    } catch (error) {
      console.error('Error fetching active expeditions:', error);
    } finally {
      setActiveExpeditionsLoading(false);
    }
  }

  async function fetchRequests() {
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from('Registry')
        .select(`
          *,
          sites (name),
          profiles:field_arch_id (full_name, username)
        `)
        .eq('chief_arch_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function handleRequestAction(requestId, newStatus) {
    try {
      const { error } = await supabase
        .from('Registry')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      
      // Update local state
      setRequests(requests.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
      logData('Request action taken', { requestId, newStatus }, 'C');
    } catch (error) {
      console.error('Error updating request:', error);
    }
  }

  const handleCompassToggle = async () => {
    if (!isCompassOpen) {
      setCompassError('');
      // Request permission for iOS devices
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          } else {
            setCompassError('PERMISSION_DENIED: IOS_SENSOR_ACCESS');
          }
        } catch (error) {
          setCompassError(`ERROR: ${error.message?.toUpperCase() || 'UNKNOWN_IOS_ERROR'}`);
          console.error('Compass permission error:', error);
        }
      } else {
        // Android / Desktop Chrome 
        if (window.isSecureContext) {
          if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
          } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
          // Set a timeout to check if we actually receive data
          setTimeout(() => {
            if (!hasOrientation) {
              setCompassError('SENSOR_TIMEOUT: NO_DATA_RECEIVED');
            }
          }, 2000);
        } else {
          setCompassError('SECURITY_ERROR: HTTPS_REQUIRED');
        }
      }
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    }
    setIsCompassOpen(!isCompassOpen);
  };

  const handleOrientation = (event) => {
    let heading = 0;
    
    // iOS absolute heading
    if (event.webkitCompassHeading) {
      heading = event.webkitCompassHeading;
    } 
    // Android absolute heading
    else if (event.absolute && event.alpha !== null) {
      heading = 360 - event.alpha;
    }
    // Fallback/Relative (might not point to true North on all devices)
    else if (event.alpha !== null) {
      heading = 360 - event.alpha;
    }

    setHeading(heading);
    setHasOrientation(true);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, []);

  const handleNotepadToggle = () => {
    const newState = !isNotepadOpen;
    setIsNotepadOpen(newState);
    logData('Notepad toggle', { isOpen: newState }, 'A');
  };

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setNote(value);
    localStorage.setItem('arch_note', value);
    logData('Note changed', { length: value.length }, 'B');
  };

  const handleCreateSite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    logData('Attempting site creation', { siteName, role: profile?.role }, 'B');

    if (profile?.role !== 'Chief Archeologist') {
      setMessage('ERROR: UNAUTHORIZED. ONLY CHIEF ARCHEOLOGISTS CAN CREATE SITES.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sites')
        .insert([
          {
            name: siteName,
            lat: parseFloat(siteLat),
            lng: parseFloat(siteLng),
            description: siteDesc,
            tourUrl: siteTour,
            status: 'In Progress',
            created_by: profile.id
          }
        ]);

      if (error) throw error;

      logData('Site created successfully', { data }, 'B');
      setMessage('SUCCESS: NEW DIG SITE REGISTERED IN GLOBAL REGISTRY.');
      setSiteName('');
      setSiteLat('');
      setSiteLng('');
      setSiteDesc('');
      setSiteTour('');
      setTimeout(() => setIsSiteFormOpen(false), 2000);
    } catch (error) {
      logData('Site creation error', { error: error.message }, 'B');
      setMessage(`ERROR: ${error.message.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const isChief = profile?.role === 'Chief Archeologist';
  const isFieldArch = profile?.role === 'Field Archeologist';

  return (
    <div className="space-y-16">
      <div className="border-b-4 border-black pb-4 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-red-600">ARCH ZONE // PROFESSIONAL TERMINAL</h2>
          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">Clearance: {profile?.role?.toUpperCase()}</p>
        </div>
        <div className="flex gap-4">
          {isChief && (
            <>
              <button 
                onClick={() => setIsInboxOpen(true)}
                className="bg-black text-white px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-[4px_4px_0px_rgba(220,38,38,1)] flex items-center gap-2"
              >
                <span className="relative">
                  Inbox
                  {requests.filter(r => r.status === 'Pending').length > 0 && (
                    <span className="absolute -top-2 -right-4 bg-red-600 text-white text-[8px] px-1 rounded-full animate-bounce">
                      {requests.filter(r => r.status === 'Pending').length}
                    </span>
                  )}
                </span>
              </button>
              <button 
                onClick={() => setIsSiteFormOpen(true)}
                className="bg-red-600 text-white px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              >
                + Register New Dig Site
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Social / Active Expeditions */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-4 border-black pl-4">
            {isFieldArch ? 'My Active Expeditions' : 'Social Hub'}
          </h3>
          
          {isFieldArch ? (
            <div className="space-y-4">
              {activeExpeditionsLoading ? (
                <div className="text-[10px] font-black uppercase tracking-widest animate-pulse">Scanning Registry...</div>
              ) : activeExpeditions.length === 0 ? (
                <div className="p-4 border-2 border-black border-dashed text-[10px] font-black uppercase text-gray-400">No approved expeditions found. Apply at the Map.</div>
              ) : (
                activeExpeditions.map(exp => (
                  <div 
                    key={exp.site_id} 
                    onClick={() => {
                      window.open(`/?view=journal&siteId=${exp.site_id}`, '_blank');
                    }}
                    className="border-2 border-black p-4 cursor-pointer hover:bg-black hover:text-white transition-all bg-white group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-[8px] font-black uppercase mb-1">Status: Active</div>
                      <span className="text-[8px] font-black uppercase underline opacity-30 group-hover:opacity-100 transition-opacity">Terminal [↗]</span>
                    </div>
                    <h4 className="font-black uppercase text-sm">{exp.sites?.name}</h4>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {['Collaboration Chat', 'Public Forum', 'Events & Announcements'].map(item => (
                <div key={item} className="border-2 border-black p-4 hover:bg-gray-100 cursor-pointer font-bold uppercase text-xs">{item}</div>
              ))}
            </div>
          )}
        </div>
        
        {/* Archives / Center Column */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-4 border-black pl-4">Archives</h3>
          <div className="bg-gray-50 border-2 border-black p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
            <div className="w-16 h-16 border-4 border-black rounded-full flex items-center justify-center animate-pulse">
              <span className="text-2xl font-black">!</span>
            </div>
            <div>
              <h4 className="font-black uppercase text-sm">Remote Terminal Mode Active</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 leading-relaxed">
                Field Journals have been moved to dedicated Secure Terminal pages for professional data integrity.
              </p>
            </div>
            <div className="w-full h-px bg-gray-200"></div>
            <p className="text-[9px] font-black uppercase text-gray-500 italic">
              Select an Expedition from the left to establish a link.
            </p>
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-4 border-black pl-4">Professional Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            {['Exclusive Map', 'Notepad', 'Compass', 'Data Upload', 'Report Syntax', '2D Illustration', 'Site Log', 'Field Sync'].map(item => (
              <div 
                key={item} 
                onClick={
                  item === 'Notepad' ? handleNotepadToggle : 
                  item === 'Compass' ? handleCompassToggle : 
                  undefined
                }
                className={`border-2 border-black p-3 hover:bg-red-50 cursor-pointer font-black uppercase text-[10px] text-center transition-all 
                  ${(item === 'Notepad' && isNotepadOpen) || (item === 'Compass' && isCompassOpen) ? 'bg-red-600 text-white border-red-600 scale-105' : 'bg-white'}`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inbox Modal */}
      {isInboxOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-white border-4 border-black w-full max-w-4xl shadow-[16px_16px_0px_rgba(0,0,0,1)] p-10 relative my-10">
            <button 
              onClick={() => setIsInboxOpen(false)}
              className="absolute top-6 right-6 font-black text-xs hover:text-red-600"
            >
              CLOSE [X]
            </button>
            
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Expedition Inbox</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Reviewing Field Personnel Requests</p>
              </div>
              <button onClick={fetchRequests} className="text-[10px] font-black uppercase underline hover:text-red-600">Refresh Feed</button>
            </div>

            <div className="space-y-4">
              {requestsLoading ? (
                <div className="p-12 text-center font-black uppercase text-xs tracking-widest animate-pulse">Syncing encrypted requests...</div>
              ) : requests.length === 0 ? (
                <div className="p-12 border-2 border-black border-dashed text-center font-black uppercase text-xs text-gray-400 tracking-widest">No pending requests in the queue.</div>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="border-2 border-black p-6 bg-gray-50 flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-black ${req.status === 'Pending' ? 'bg-amber-100' : req.status === 'Approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {req.status}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-black text-lg uppercase leading-tight">
                        <span className="text-red-600">REQUEST FROM:</span> {req.profiles?.full_name} (@{req.profiles?.username})
                      </h4>
                      <p className="text-xs font-bold uppercase">
                        <span className="text-gray-400">ASSIGNMENT:</span> {req.sites?.name}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 py-4 border-y border-gray-200">
                        <div>
                          <span className="text-[8px] font-black text-gray-400 uppercase block">Experience</span>
                          <span className="text-xs font-bold uppercase">{req.experience_years} Years</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-gray-400 uppercase block">Specialization</span>
                          <span className="text-xs font-bold uppercase">{req.specialization}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-gray-400 uppercase block">Availability</span>
                          <span className="text-xs font-bold uppercase">{req.availability}</span>
                        </div>
                      </div>

                          {req.message && (
                            <div className="mt-4 p-3 bg-white border border-black italic text-xs font-bold uppercase text-gray-600">
                              "{req.message}"
                            </div>
                          )}

                          {req.status === 'Approved' && (
                            <button 
                              onClick={() => {
                                window.open(`/?view=journal&siteId=${req.site_id}`, '_blank');
                              }}
                              className="mt-4 text-[10px] font-black uppercase underline hover:text-red-600"
                            >
                              Open Field Terminal → [↗]
                            </button>
                          )}
                        </div>

                    {req.status === 'Pending' && (
                      <div className="flex md:flex-col gap-2 justify-end">
                        <button 
                          onClick={() => handleRequestAction(req.id, 'Approved')}
                          className="bg-green-600 text-white px-4 py-2 text-[10px] font-black uppercase hover:bg-black transition-all"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRequestAction(req.id, 'Rejected')}
                          className="bg-red-600 text-white px-4 py-2 text-[10px] font-black uppercase hover:bg-black transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Site Creation Modal */}
      {isSiteFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-white border-4 border-black w-full max-w-2xl shadow-[16px_16px_0px_rgba(0,0,0,1)] p-10 relative my-10">
            <button 
              onClick={() => setIsSiteFormOpen(false)}
              className="absolute top-6 right-6 font-black text-xs hover:text-red-600"
            >
              CLOSE [X]
            </button>
            
            <div className="mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Register New Expedition</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Global Registry Entry // v1.0</p>
            </div>

            <form onSubmit={handleCreateSite} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Site Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full border-2 border-black p-3 text-xs font-bold uppercase outline-none focus:bg-gray-50"
                    placeholder="e.g. Valley of the Kings"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">360 Tour URL</label>
                  <input
                    type="url"
                    required
                    value={siteTour}
                    onChange={(e) => setSiteTour(e.target.value)}
                    className="w-full border-2 border-black p-3 text-xs font-bold outline-none focus:bg-gray-50"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Latitude (Decimal Degrees)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={siteLat}
                    onChange={(e) => setSiteLat(e.target.value)}
                    className="w-full border-2 border-black p-3 text-xs font-bold outline-none focus:bg-gray-50"
                    placeholder="e.g. 29.9792"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Longitude (Decimal Degrees)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={siteLng}
                    onChange={(e) => setSiteLng(e.target.value)}
                    className="w-full border-2 border-black p-3 text-xs font-bold outline-none focus:bg-gray-50"
                    placeholder="e.g. 31.1342"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Site Description</label>
                <textarea
                  required
                  value={siteDesc}
                  onChange={(e) => setSiteDesc(e.target.value)}
                  className="w-full border-2 border-black p-3 text-xs font-bold uppercase outline-none focus:bg-gray-50 h-32 resize-none"
                  placeholder="Official site description and historical significance..."
                />
              </div>

              <button
                disabled={loading}
                className="w-full bg-black text-white py-4 text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:bg-gray-200"
              >
                {loading ? 'PROCESSING...' : 'Authorize & Register Site'}
              </button>

              {message && (
                <div className={`p-4 border-2 border-black text-[10px] font-black text-center uppercase ${message.includes('ERROR') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Compass UI */}
      {isCompassOpen && (
        <div className="fixed top-24 left-8 w-[90%] md:w-80 bg-white border-4 border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] z-[100] p-8 flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-8 border-b-2 border-black pb-2">
            <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 animate-pulse"></span>
              Field Compass // v1.0
            </h4>
            <button 
              onClick={handleCompassToggle} 
              className="text-xs font-black hover:bg-black hover:text-white px-2 py-1 border border-black transition-colors"
            >
              CLOSE [X]
            </button>
          </div>

          <div className="relative w-48 h-48 border-4 border-black rounded-full flex items-center justify-center bg-gray-50 shadow-inner">
            {/* Compass Rose */}
            <div 
              className="absolute inset-0 transition-transform duration-100 ease-linear"
              style={{ transform: `rotate(${-heading}deg)` }}
            >
              <span className="absolute top-2 left-1/2 -translate-x-1/2 font-black text-red-600">N</span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-black">S</span>
              <span className="absolute left-2 top-1/2 -translate-y-1/2 font-black">W</span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 font-black">E</span>
              
              {/* Dial Marks */}
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="absolute top-0 left-1/2 w-0.5 h-3 bg-black -translate-x-1/2 origin-[0_96px]"
                  style={{ transform: `rotate(${i * 30}deg)` }}
                />
              ))}
            </div>

            {/* Fixed Needle */}
            <div className="relative w-1 h-32 bg-red-600 z-10 before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:border-l-[6px] before:border-l-transparent before:border-r-[6px] before:border-r-transparent before:border-b-[12px] before:border-b-red-600 shadow-lg"></div>
            <div className="absolute w-4 h-4 bg-black rounded-full border-2 border-white z-20"></div>
          </div>

          <div className="mt-8 text-center">
            <div className="text-3xl font-black italic">{Math.round(heading)}°</div>
            <div className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-[0.2em]">
              {hasOrientation ? 'SATELLITE_SYNC_ACTIVE' : 'CALIBRATING_SENSORS...'}
            </div>
          </div>

          <div className="mt-6 w-full p-3 bg-gray-50 border-2 border-black border-dashed text-[9px] font-bold text-center leading-tight uppercase">
            {compassError ? (
              <span className="text-red-600">{compassError}</span>
            ) : hasOrientation 
              ? 'Compass calibrated. Align device flat for maximum geospatial accuracy.' 
              : 'Waiting for device orientation data. (Requires mobile device with magnetometer)'}
          </div>
          {!window.isSecureContext && !compassError && (
            <div className="mt-2 text-[8px] font-black text-red-600 uppercase text-center">
              ⚠️ Note: Sensors require HTTPS or Localhost
            </div>
          )}
        </div>
      )}

      {/* Notepad UI - Moved to Fixed Position for Visibility */}
      {isNotepadOpen && (
        <div className="fixed top-24 right-8 w-[90%] md:w-96 bg-white border-4 border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] z-[100] p-6">
          <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
            <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 animate-pulse"></span>
              Field Notepad // v1.0
            </h4>
            <button 
              onClick={handleNotepadToggle} 
              className="text-xs font-black hover:bg-black hover:text-white px-2 py-1 border border-black transition-colors"
            >
              CLOSE [X]
            </button>
          </div>
          <textarea
            autoFocus
            value={note}
            onChange={handleNoteChange}
            placeholder="ENTER FIELD OBSERVATIONS..."
            className="w-full h-80 bg-gray-50 border-2 border-black p-4 text-xs font-bold uppercase tracking-wider outline-none focus:bg-white transition-colors resize-none"
          />
          <div className="mt-4 flex justify-between items-center text-[10px] font-black">
            <span className="text-gray-400">STATUS: AUTO_SAVING...</span>
            <span className="bg-black text-white px-2 py-0.5">CHARS: {note.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchZone;
