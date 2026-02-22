import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ArchZone = ({ profile, onNavigateToMap }) => {
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [isCompassOpen, setIsCompassOpen] = useState(false);
  const [isSiteFormOpen, setIsSiteFormOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [savedNotes, setSavedNotes] = useState([]); // { id, title, content, updatedAt }
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [note, setNote] = useState('');
  
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
  
  // Archives = recent journal entries (what was recorded), not the same as expedition list
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  
  // Site Form State
  const [siteName, setSiteName] = useState('');
  const [siteLat, setSiteLat] = useState('');
  const [siteLng, setSiteLng] = useState('');
  const [siteDesc, setSiteDesc] = useState('');
  const [siteTour, setSiteTour] = useState('');
  const [siteVisibility, setSiteVisibility] = useState('public'); // 'private' | 'team' | 'student' | 'public'
  const [siteCeramicCount, setSiteCeramicCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Ceramic counter (field tool: count sherds in search area)
  const [ceramicCount, setCeramicCount] = useState(0);
  const [isCeramicCounterOpen, setIsCeramicCounterOpen] = useState(false);
  const [ceramicSessionLabel, setCeramicSessionLabel] = useState('');
  const [ceramicDimensionLength, setCeramicDimensionLength] = useState('');
  const [ceramicDimensionWidth, setCeramicDimensionWidth] = useState('');
  const [currentSessionPieces, setCurrentSessionPieces] = useState([]); // { lat, lng, createdAt } per click
  const [ceramicGeoError, setCeramicGeoError] = useState('');
  const [ceramicSessions, setCeramicSessions] = useState([]); // { id, label, count, createdAt, lengthM?, widthM?, pieces? }

  // Social Hub panels: 'chat' | 'forum' | 'events' | null
  const [socialHubPanel, setSocialHubPanel] = useState(null);

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
    if (profile?.role === 'Chief Archeologist') {
      fetchRequests();
    } else if (profile?.role === 'Field Archeologist') {
      fetchActiveExpeditions();
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;
    try {
      const key = `arch_notes_${profile.id}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedNotes(parsed);
          return;
        }
      }
      const legacy = localStorage.getItem(`arch_note_${profile.id}`);
      if (legacy != null && legacy.trim() !== '') {
        const migrated = [{ id: 'n' + Date.now(), title: 'Migrated note', content: legacy, updatedAt: new Date().toISOString() }];
        setSavedNotes(migrated);
        localStorage.setItem(key, JSON.stringify(migrated));
      }
    } catch (_) {}
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    try {
      const raw = localStorage.getItem(`ceramic_sessions_${profile.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCeramicSessions(parsed);
      }
    } catch (_) {}
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    if (profile?.role === 'Field Archeologist') {
      fetchArchiveEntriesField();
    } else if (profile?.role === 'Chief Archeologist') {
      fetchArchiveEntriesChief();
    }
  }, [profile?.id, profile?.role, requests]);

  async function fetchArchiveEntriesField() {
    setArchiveLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_journals')
        .select('id, site_id, notes, findings, created_at, sites(name)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      setArchiveEntries(data || []);
    } catch (error) {
      console.error('Error fetching archive entries:', error);
      setArchiveEntries([]);
    } finally {
      setArchiveLoading(false);
    }
  }

  async function fetchArchiveEntriesChief() {
    setArchiveLoading(true);
    try {
      const siteIds = [...new Set(requests.map(r => r.site_id).filter(Boolean))];
      if (siteIds.length === 0) {
        setArchiveEntries([]);
        setArchiveLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('site_journals')
        .select('id, site_id, notes, findings, created_at, sites(name), profiles:user_id(full_name)')
        .in('site_id', siteIds)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setArchiveEntries(data || []);
    } catch (error) {
      console.error('Error fetching archive entries:', error);
      setArchiveEntries([]);
    } finally {
      setArchiveLoading(false);
    }
  }

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

  const handleCeramicCounterToggle = () => {
    setIsCeramicCounterOpen(prev => !prev);
  };

  const persistCeramicSessions = (sessions) => {
    if (!profile?.id) return;
    try {
      localStorage.setItem(`ceramic_sessions_${profile.id}`, JSON.stringify(sessions));
    } catch (_) {}
  };

  const handleCeramicAddOne = () => {
    setCeramicGeoError('');
    const createdAt = new Date().toISOString();
    if (!navigator.geolocation) {
      setCurrentSessionPieces(p => [...p, { lat: null, lng: null, createdAt }]);
      setCeramicCount(c => c + 1);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentSessionPieces(p => [...p, { lat: pos.coords.latitude, lng: pos.coords.longitude, createdAt }]);
        setCeramicCount(c => c + 1);
      },
      () => {
        setCeramicGeoError('Location denied or unavailable');
        setCurrentSessionPieces(p => [...p, { lat: null, lng: null, createdAt }]);
        setCeramicCount(c => c + 1);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleSaveCeramicSession = () => {
    if (ceramicCount < 0) return;
    const label = ceramicSessionLabel.trim() || `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const session = {
      id: 's' + Date.now(),
      label,
      count: ceramicCount,
      createdAt: new Date().toISOString(),
      lengthM: ceramicDimensionLength !== '' ? parseFloat(ceramicDimensionLength) : null,
      widthM: ceramicDimensionWidth !== '' ? parseFloat(ceramicDimensionWidth) : null,
      pieces: currentSessionPieces.length ? currentSessionPieces : undefined
    };
    const next = [session, ...ceramicSessions];
    setCeramicSessions(next);
    persistCeramicSessions(next);
    setCeramicCount(0);
    setCeramicSessionLabel('');
    setCeramicDimensionLength('');
    setCeramicDimensionWidth('');
    setCurrentSessionPieces([]);
    setCeramicGeoError('');
  };

  const handleUseCeramicSessionCount = (count) => {
    setSiteCeramicCount(String(count));
    setIsCeramicCounterOpen(false);
    setIsSiteFormOpen(true);
  };

  const handleDeleteCeramicSession = (id) => {
    const next = ceramicSessions.filter(s => s.id !== id);
    setCeramicSessions(next);
    persistCeramicSessions(next);
  };

  const persistNotes = (notes) => {
    if (!profile?.id) return;
    try {
      localStorage.setItem(`arch_notes_${profile.id}`, JSON.stringify(notes));
    } catch (_) {}
  };

  const handleNewNote = () => {
    setActiveNoteId(null);
    setNoteTitle('');
    setNote('');
  };

  const handleSelectNote = (n) => {
    setActiveNoteId(n.id);
    setNoteTitle(n.title || '');
    setNote(n.content || '');
  };

  const handleSaveNote = () => {
    const title = noteTitle.trim() || 'Untitled';
    const updatedAt = new Date().toISOString();
    if (activeNoteId) {
      const next = savedNotes.map((n) =>
        n.id === activeNoteId ? { ...n, title, content: note, updatedAt } : n
      );
      setSavedNotes(next);
      persistNotes(next);
    } else {
      const newNote = { id: 'n' + Date.now(), title, content: note, updatedAt };
      const next = [newNote, ...savedNotes];
      setSavedNotes(next);
      persistNotes(next);
      setActiveNoteId(newNote.id);
      setNoteTitle(title);
    }
  };

  const handleDeleteNote = () => {
    if (!activeNoteId) return;
    const next = savedNotes.filter((n) => n.id !== activeNoteId);
    setSavedNotes(next);
    persistNotes(next);
    setActiveNoteId(next[0]?.id ?? null);
    if (next[0]) handleSelectNote(next[0]);
    else handleNewNote();
  };

  const handleNoteChange = (e) => setNote(e.target.value);
  const handleNoteTitleChange = (e) => setNoteTitle(e.target.value);

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
            created_by: profile.id,
            is_public: siteVisibility === 'public',
            visibility: siteVisibility, // 'public' | 'student' | 'team' | 'private'
            ceramic_count: siteCeramicCount !== '' ? parseInt(siteCeramicCount, 10) : null
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
      setSiteVisibility('public');
      setSiteCeramicCount('');
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
              {[
                { id: 'chat', label: 'Collaboration Chat' },
                { id: 'forum', label: 'Public Forum' },
                { id: 'events', label: 'Events & Announcements' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSocialHubPanel(id)}
                  className="w-full text-left border-2 border-black p-4 hover:bg-black hover:text-white transition-all font-bold uppercase text-xs"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Archives / Center Column — recent journal entries (what was recorded), not the site list */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-4 border-black pl-4">Archives</h3>
          <div className="bg-gray-50 border-2 border-black p-6 min-h-[400px] flex flex-col">
            {isFieldArch ? (
              <>
                <p className="text-[9px] font-black uppercase text-gray-500 mb-3">Your recent field records</p>
                {archiveLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Loading records...</span>
                  </div>
                ) : archiveEntries.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-6">
                    <p className="text-[10px] font-black uppercase text-gray-400">No records yet.</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Use &quot;My Active Expeditions&quot; to open a site terminal and add entries.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {archiveEntries.map(entry => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => window.open(`/?view=journal&siteId=${entry.site_id}`, '_blank')}
                        className="w-full text-left border-2 border-black p-3 bg-white hover:bg-black hover:text-white transition-all"
                      >
                        <span className="text-[8px] font-black uppercase text-gray-500 block">{entry.sites?.name}</span>
                        <span className="text-[9px] font-black uppercase block mt-0.5 truncate">{entry.findings || entry.notes?.slice(0, 40) || 'Entry'}…</span>
                        <span className="text-[7px] font-bold opacity-70 block mt-1">{new Date(entry.created_at).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : isChief ? (
              <>
                <p className="text-[9px] font-black uppercase text-gray-500 mb-3">Recent activity on your sites</p>
                {archiveLoading || requestsLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Loading records...</span>
                  </div>
                ) : archiveEntries.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-6">
                    <p className="text-[10px] font-black uppercase text-gray-400">No records yet.</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">Activity from field personnel will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {archiveEntries.map(entry => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => window.open(`/?view=journal&siteId=${entry.site_id}`, '_blank')}
                        className="w-full text-left border-2 border-black p-3 bg-white hover:bg-black hover:text-white transition-all"
                      >
                        <span className="text-[8px] font-black uppercase text-gray-500 block">{entry.sites?.name}</span>
                        <span className="text-[9px] font-black uppercase block mt-0.5 truncate">{entry.findings || entry.notes?.slice(0, 40) || 'Entry'}…</span>
                        <span className="text-[7px] font-bold opacity-70 block mt-1">
                          {entry.profiles?.full_name && <>{entry.profiles.full_name} · </>}
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-6">
                <p className="text-[10px] font-black uppercase text-gray-400">Archives</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Field journals are available in the Field Terminal.</p>
              </div>
            )}
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-4 border-black pl-4">Professional Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            {['Exclusive Map', 'Notepad', 'Compass', 'Ceramic Counter', 'Data Upload', 'Report Syntax', '2D Illustration', '3D Illustration', '3D Viewer', 'Site Log', 'Field Sync'].map(item => {
              const isLink = item === '2D Illustration' || item === '3D Viewer';
              const href = item === '2D Illustration' ? '/illustrator-2d' : item === '3D Viewer' ? '/viewer-3d' : null;
              const className = `border-2 border-black p-3 hover:bg-red-50 cursor-pointer font-black uppercase text-[10px] text-center transition-all 
                ${(item === 'Notepad' && isNotepadOpen) || (item === 'Compass' && isCompassOpen) || (item === 'Ceramic Counter' && isCeramicCounterOpen) ? 'bg-red-600 text-white border-red-600 scale-105' : 'bg-white'}`;
              if (isLink && href) {
                return (
                  <a
                    key={item}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                    onClick={(e) => {
                      e.preventDefault();
                      const w = window.open(href, '_blank', 'noopener,noreferrer');
                      if (!w) window.location.href = href;
                    }}
                  >
                    {item}
                  </a>
                );
              }
              return (
                <div
                  key={item}
                  onClick={
                    item === 'Exclusive Map' ? () => onNavigateToMap?.() :
                    item === 'Notepad' ? handleNotepadToggle :
                    item === 'Compass' ? handleCompassToggle :
                    item === 'Ceramic Counter' ? handleCeramicCounterToggle :
                    undefined
                  }
                  className={className}
                >
                  {item}
                </div>
              );
            })}
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

      {/* Social Hub modals */}
      {socialHubPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-white border-4 border-black w-full max-w-2xl shadow-[16px_16px_0px_rgba(0,0,0,1)] p-10 relative my-10">
            <button
              onClick={() => setSocialHubPanel(null)}
              className="absolute top-6 right-6 font-black text-xs hover:text-red-600"
            >
              CLOSE [X]
            </button>

            {socialHubPanel === 'chat' && (
              <>
                <div className="mb-4">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Collaboration Chat</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Channel: #expedition-general (demo)</p>
                </div>
                <div className="border-2 border-black bg-gray-50 min-h-[280px] max-h-[360px] overflow-y-auto p-4 space-y-4 mb-4">
                  {[
                    { who: 'Chief_Martinez', msg: 'Field team: confirm lidar data upload by EOD. We need it for the seminar prep.', time: '09:12' },
                    { who: 'Field_Arch_01', msg: 'Copy that. Section B is done, uploading now.', time: '09:34' },
                    { who: 'Chief_Martinez', msg: 'Good. Students — reminder: Public Forum is open for the stratigraphy Q&A.', time: '10:01' },
                    { who: 'Field_Arch_02', msg: 'Roman Forum (Student Lab) — found a possible new context layer. Logging in Journal.', time: '11:22' },
                    { who: 'Chief_Martinez', msg: 'Noted. Tag it as student-visible when you post.', time: '11:45' }
                  ].map((m, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black uppercase text-gray-500">
                        {m.who} <span className="text-gray-400 font-normal">{m.time}</span>
                      </span>
                      <p className="text-xs font-bold uppercase leading-snug pl-2 border-l-2 border-black">{m.msg}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message... (demo — not sent)"
                    disabled
                    className="flex-1 border-2 border-black p-2 text-xs font-bold uppercase bg-white opacity-60"
                  />
                  <button type="button" disabled className="bg-gray-300 text-gray-500 px-4 py-2 text-[10px] font-black uppercase cursor-not-allowed">Send</button>
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase mt-2">Live messaging will be wired in a future release.</p>
              </>
            )}

            {socialHubPanel === 'forum' && (
              <>
                <div className="mb-4">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Public Forum</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Community threads (demo)</p>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {[
                    { title: 'Stratigraphy Q&A — Student Session', author: 'Chief_Martinez', preview: 'Bring your section drawings and we’ll review layer interpretation. Open to all students.', date: '5 Feb', replies: 12 },
                    { title: 'Best practices for field photography', author: 'Field_Arch_01', preview: 'Lighting, scale bars, and metadata. Share your setup.', date: '4 Feb', replies: 8 },
                    { title: 'Lidar vs traditional survey — when to use which?', author: 'Field_Arch_02', preview: 'Discussion for upcoming seminar. Post your questions here.', date: '3 Feb', replies: 5 },
                    { title: 'New declassified records in Data Archive', author: 'System', preview: 'This week’s field records from Giza and Roman Forum (Student Lab) are now visible in Edu Lab.', date: '2 Feb', replies: 3 }
                  ].map((thread, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left border-2 border-black p-4 bg-white hover:bg-black hover:text-white transition-all"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-black uppercase text-xs leading-tight">{thread.title}</h4>
                        <span className="text-[8px] font-black uppercase shrink-0 opacity-70">{thread.replies} replies</span>
                      </div>
                      <p className="text-[10px] font-bold uppercase text-gray-500 mt-1 line-clamp-2 hover:text-gray-200">{thread.preview}</p>
                      <p className="text-[8px] font-black uppercase mt-2 opacity-60">{thread.author} · {thread.date}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase mt-4">Thread replies and posting will be wired in a future release.</p>
              </>
            )}

            {socialHubPanel === 'events' && (
              <>
                <div className="mb-4">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Events & Announcements</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Seminars, digs, and updates</p>
                </div>
                <div className="space-y-4 max-h-[420px] overflow-y-auto">
                  {[
                    { type: 'Seminar', title: 'International Seminar on Lidar Tech', date: '12 FEB', loc: 'Virtual Hub', desc: 'Remote sensing and 3D documentation. Registration open.' },
                    { type: 'Field day', title: 'Roman Forum (Student Lab) — guided session', date: '18 FEB', loc: 'On-site / stream', desc: 'Students: sign up via Edu Lab. Limited slots.' },
                    { type: 'Announcement', title: 'New Student Map and filters live', date: '7 FEB', loc: 'Global Registry', desc: 'Students can now use the Student Map and Student-only filter on the map.' },
                    { type: 'Seminar', title: 'Ceramic typology workshop', date: '25 FEB', loc: 'Virtual Hub', desc: 'Classification and dating. Prerequisite: Stratigraphy module.' }
                  ].map((ev, i) => (
                    <div key={i} className="border-2 border-black p-4 bg-white hover:bg-gray-50 transition-all">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 border border-black bg-black text-white">{ev.type}</span>
                        <span className="text-[8px] font-black uppercase text-gray-500">{ev.date} · {ev.loc}</span>
                      </div>
                      <h4 className="font-black uppercase text-sm mt-1">{ev.title}</h4>
                      <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase">{ev.desc}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
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

              <div className="space-y-2 border-2 border-black p-3 bg-gray-50">
                <label className="text-[10px] font-black uppercase tracking-widest block">Visibility</label>
                <select
                  value={siteVisibility}
                  onChange={(e) => setSiteVisibility(e.target.value)}
                  className="w-full border-2 border-black p-2 text-xs font-bold uppercase bg-white"
                >
                  <option value="private">Private (Exclusive Map only — your eyes)</option>
                  <option value="team">Team (Students & approved personnel)</option>
                  <option value="student">Student (students & archeologists)</option>
                  <option value="public">Public (everyone)</option>
                </select>
              </div>

              <div className="space-y-2 border-2 border-black p-3 bg-amber-50">
                <label className="text-[10px] font-black uppercase tracking-widest block">Ceramic pieces (count)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={siteCeramicCount}
                    onChange={(e) => setSiteCeramicCount(e.target.value)}
                    className="w-32 border-2 border-black p-2 text-xs font-bold uppercase outline-none focus:bg-white"
                    placeholder="0"
                  />
                  {ceramicCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSiteCeramicCount(String(ceramicCount))}
                      className="text-[10px] font-black uppercase border-2 border-black px-3 py-2 hover:bg-black hover:text-white transition-all"
                    >
                      Use counter ({ceramicCount})
                    </button>
                  )}
                </div>
                <p className="text-[9px] font-black text-gray-500 uppercase">Optional. Use Ceramic Counter tool in the field, then paste here when registering the site.</p>
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

      {/* Ceramic Counter UI */}
      {isCeramicCounterOpen && (
        <div className="fixed top-24 right-8 w-[90%] md:w-80 max-h-[90vh] flex flex-col bg-white border-4 border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] z-[100] p-6">
          <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
            <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Ceramic Counter
            </h4>
            <button
              onClick={handleCeramicCounterToggle}
              className="text-xs font-black hover:bg-black hover:text-white px-2 py-1 border border-black transition-colors"
            >
              CLOSE [X]
            </button>
          </div>
          <p className="text-[9px] font-black uppercase text-gray-500 mb-3">+1 records this piece and your current GPS location (allow location when prompted).</p>
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-24 h-24 border-4 border-black flex items-center justify-center bg-amber-50">
              <span className="text-4xl font-black tabular-nums">{ceramicCount}</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCeramicAddOne}
                className="bg-black text-white px-6 py-3 text-sm font-black uppercase hover:bg-amber-600 transition-colors border-2 border-black"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => { setCeramicCount(0); setCurrentSessionPieces([]); setCeramicGeoError(''); }}
                className="border-2 border-black px-4 py-3 text-[10px] font-black uppercase hover:bg-gray-100 transition-colors"
              >
                Reset
              </button>
            </div>
            {currentSessionPieces.length > 0 && (
              <p className="text-[9px] font-black uppercase text-amber-700">
                {currentSessionPieces.filter(p => p.lat != null).length}/{currentSessionPieces.length} with location
              </p>
            )}
            {ceramicGeoError && <p className="text-[9px] font-black uppercase text-red-600">{ceramicGeoError}</p>}
          </div>
          <div className="space-y-2 mb-3">
            <label className="text-[9px] font-black uppercase text-gray-500 block">Site dimensions (optional)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={ceramicDimensionLength}
                onChange={(e) => setCeramicDimensionLength(e.target.value)}
                placeholder="Length (m)"
                className="flex-1 min-w-0 border-2 border-black p-2 text-[10px] font-bold uppercase outline-none focus:bg-amber-50"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={ceramicDimensionWidth}
                onChange={(e) => setCeramicDimensionWidth(e.target.value)}
                placeholder="Width (m)"
                className="flex-1 min-w-0 border-2 border-black p-2 text-[10px] font-bold uppercase outline-none focus:bg-amber-50"
              />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <label className="text-[9px] font-black uppercase text-gray-500 block">Field / area (optional)</label>
            <input
              type="text"
              value={ceramicSessionLabel}
              onChange={(e) => setCeramicSessionLabel(e.target.value)}
              placeholder="e.g. Grid A1, Trench 2"
              className="w-full border-2 border-black p-2 text-[10px] font-bold uppercase outline-none focus:bg-amber-50"
            />
            <button
              type="button"
              onClick={handleSaveCeramicSession}
              disabled={ceramicCount === 0}
              className="w-full bg-amber-500 text-black py-2 text-[10px] font-black uppercase border-2 border-black hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save session ({ceramicCount})
            </button>
          </div>
          <div className="border-t-2 border-black pt-3 flex-1 min-h-0 flex flex-col">
            <p className="text-[9px] font-black uppercase text-gray-500 mb-2">Saved sessions</p>
            {ceramicSessions.length === 0 ? (
              <p className="text-[9px] font-bold text-gray-400 uppercase">No sessions yet. Count and save above.</p>
            ) : (
              <ul className="space-y-2 overflow-y-auto max-h-48">
                {ceramicSessions.map(s => (
                  <li key={s.id} className="border-2 border-black p-2 bg-gray-50 flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase truncate">{s.label}</p>
                      <p className="text-[9px] text-gray-500">
                        {s.count} pcs
                        {(s.lengthM != null || s.widthM != null) && ` · ${s.lengthM ?? '?'}×${s.widthM ?? '?'} m`}
                        {s.pieces?.length > 0 && ` · ${s.pieces.filter(p => p.lat != null).length} locations`}
                        {' · '}{new Date(s.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUseCeramicSessionCount(s.count)}
                        className="text-[8px] font-black uppercase border border-black px-2 py-1 hover:bg-black hover:text-white"
                      >
                        Use
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCeramicSession(s.id)}
                        className="text-[8px] font-black uppercase border border-red-600 text-red-600 px-2 py-1 hover:bg-red-600 hover:text-white"
                      >
                        Del
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase mt-3 text-center">Use → opens Register New Expedition with this count.</p>
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

      {/* Notepad UI - Saved notes + editor */}
      {isNotepadOpen && (
        <div className="fixed top-24 right-8 w-[95%] max-w-2xl bg-white border-4 border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] z-[100] flex flex-col max-h-[85vh]">
          <div className="flex justify-between items-center p-4 border-b-2 border-black">
            <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 animate-pulse"></span>
              Field Notepad // Saved notes
            </h4>
            <button
              onClick={handleNotepadToggle}
              className="text-xs font-black hover:bg-black hover:text-white px-2 py-1 border border-black transition-colors"
            >
              CLOSE [X]
            </button>
          </div>
          <div className="flex flex-1 min-h-0">
            <div className="w-44 shrink-0 border-r-2 border-black flex flex-col bg-gray-50">
              <button
                type="button"
                onClick={handleNewNote}
                className="p-2 border-b-2 border-black text-[10px] font-black uppercase bg-black text-white hover:bg-red-600 transition-colors"
              >
                + New note
              </button>
              <div className="flex-1 overflow-y-auto p-2">
                {savedNotes.length === 0 ? (
                  <p className="text-[9px] font-bold text-gray-400 uppercase p-2">No saved notes</p>
                ) : (
                  savedNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleSelectNote(n)}
                      className={`w-full text-left p-2 mb-1 border-2 text-[9px] font-black uppercase transition-colors ${
                        activeNoteId === n.id ? 'border-black bg-red-600 text-white' : 'border-black bg-white hover:bg-red-50'
                      }`}
                    >
                      <span className="block truncate">{n.title || 'Untitled'}</span>
                      <span className="block text-[7px] opacity-70 mt-0.5">
                        {new Date(n.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col p-4 min-w-0">
              <input
                type="text"
                value={noteTitle}
                onChange={handleNoteTitleChange}
                placeholder="Note title..."
                className="w-full border-2 border-black p-2 mb-2 text-xs font-black uppercase outline-none focus:bg-gray-50"
              />
              <textarea
                value={note}
                onChange={handleNoteChange}
                placeholder="ENTER FIELD OBSERVATIONS..."
                className="flex-1 min-h-[200px] w-full bg-gray-50 border-2 border-black p-4 text-xs font-bold uppercase tracking-wider outline-none focus:bg-white transition-colors resize-none"
              />
              <div className="flex justify-between items-center gap-2 mt-3 flex-wrap">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="bg-black text-white px-3 py-2 text-[10px] font-black uppercase hover:bg-red-600 transition-colors"
                  >
                    Save note
                  </button>
                  {activeNoteId && (
                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      className="border-2 border-red-600 text-red-600 px-3 py-2 text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <span className="text-[10px] font-black text-gray-400">CHARS: {note.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ArchZone;
