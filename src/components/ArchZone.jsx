import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MiniMapWidget from './MiniMapWidget';
import AIAssistant from './AIAssistant';
import Scanner3D from './Scanner3D';
import ReportSyntaxTemplates from './ReportSyntaxTemplates';

const ArchZone = ({ profile, onNavigateToMap, isDesktop = false, onOpenArchives, onOpenSocial, onOpenJournal }) => {
  const navigate = useNavigate();
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

  const [archSearch, setArchSearch] = useState('');
  const [showArchivesPanel, setShowArchivesPanel] = useState(false);
  const [archView, setArchViewState] = useState(() => {
    try { return sessionStorage.getItem('archZone_view') || 'dashboard'; } catch { return 'dashboard'; }
  });
  const setArchView = (v) => {
    try { sessionStorage.setItem('archZone_view', v); } catch {}
    setArchViewState(v);
  };
  const [activeTool, setActiveTool] = useState(null); // 'map' | 'notepad' | 'compass' | 'ceramic' | null (from tools tab)

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
    if (profile?.role === 'Director') {
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
    } else if (profile?.role === 'Director') {
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

  /** When Chief approves a request, ensure a chatroom exists for that site and add field arch + chief as members. */
  async function ensureChatroomAndMembers(siteId, siteName, chiefArchId, fieldArchId) {
    if (!supabase || !siteId) return;
    try {
      const { data: existing } = await supabase.from('chatrooms').select('id').eq('site_id', siteId).maybeSingle();
      let chatroomId = existing?.id;
      if (!chatroomId) {
        const name = siteName || 'Dig site';
        const { data: inserted, error: insertErr } = await supabase.from('chatrooms').insert({ site_id: siteId, name, room_type: 'site' }).select('id').single();
        if (insertErr) {
          console.error('Chatroom insert error:', insertErr);
          return;
        }
        chatroomId = inserted.id;
      }
      const userIds = [fieldArchId, chiefArchId].filter(Boolean);
      for (const uid of userIds) {
        const { error: memberErr } = await supabase.from('chatroom_members').insert({ chatroom_id: chatroomId, user_id: uid });
        if (memberErr && memberErr.code !== '23505') console.error('chatroom_members insert error', memberErr); // 23505 = unique violation, already member
      }
    } catch (e) {
      console.error('ensureChatroomAndMembers error:', e);
    }
  }

  async function handleRequestAction(requestId, newStatus) {
    const req = requests.find(r => r.id === requestId);
    try {
      const { error } = await supabase
        .from('Registry')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      if (newStatus === 'Approved' && req?.site_id) {
        await ensureChatroomAndMembers(req.site_id, req.sites?.name, req.chief_arch_id, req.field_arch_id);
      }
      
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

    if (profile?.role !== 'Director') {
      setMessage('ERROR: UNAUTHORIZED. ONLY DIRECTORS CAN CREATE SITES.');
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

  const isChief = profile?.role === 'Director';
  const isFieldArch = profile?.role === 'Field Archeologist';

  const fromArchives = archiveEntries.slice(0, 2).map(entry => ({
    title: entry.sites?.name || 'Field record',
    secondary: ((entry.findings || entry.notes) || 'Entry').slice(0, 60) + (((entry.findings || entry.notes) || '').length > 60 ? '…' : ''),
    siteId: entry.site_id,
  }));
  const fromExpeditions = isFieldArch && fromArchives.length < 2
    ? activeExpeditions
        .filter(exp => !fromArchives.some(r => r.title === exp.sites?.name))
        .slice(0, 2 - fromArchives.length)
        .map(exp => ({ title: exp.sites?.name || 'Expedition', secondary: 'Active expedition', siteId: exp.site_id }))
    : [];
  const placeholders = Array(Math.max(0, 2 - fromArchives.length - fromExpeditions.length))
    .fill(null)
    .map(() => ({ title: 'Card Title', secondary: 'Secondary text', siteId: null }));
  const recentActivityItems = [...fromArchives, ...fromExpeditions, ...placeholders].slice(0, 2);

  const dayLabels = ['T', 'W', 'T', 'F', 'S', 'Sa'];
  const sampleDates = [10, 11, 12, 13, 14, 15];
  const highlightedDates = [12, 13, 14];

  const professionalTools = [
    { id: 'notepad', label: 'Notepad', icon: 'notepad', action: () => setActiveTool('notepad') },
    { id: 'compass', label: 'Compass', icon: 'compass', action: () => setActiveTool('compass') },
    { id: 'ceramic', label: 'Ceramic Counter', icon: 'counter', action: () => setActiveTool('ceramic') },
    { id: 'upload', label: 'Data Upload', icon: 'upload' },
    { id: 'report', label: 'Report Syntax', icon: 'document', action: () => setActiveTool('report') },
    { id: '2d', label: '2D Illustration', icon: 'canvas', action: () => navigate('/illustrator-2d') },
    { id: '3d-ill', label: '3D Illustration', icon: 'cube', action: isDesktop ? undefined : () => setActiveTool('3d-scanner') },
    { id: '3d-view', label: '3D Viewer', icon: 'cube', action: () => navigate('/viewer-3d') },
    { id: 'sitelog', label: 'Site Log', icon: 'clipboard' },
    { id: 'sync', label: 'Field Sync', icon: 'sync' },
  ];

  const ToolIcon = ({ name, className = 'w-8 h-8' }) => {
    const icons = {
      map: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
      notepad: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      compass: <><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 3v4M12 17v4M3 12h4M17 12h4M5.64 5.64l2.83 2.83M15.53 15.53l2.83 2.83M5.64 18.36l2.83-2.83M15.53 8.47l2.83-2.83" /></>,
      counter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />,
      upload: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
      document: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      canvas: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />,
      cube: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      clipboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
      sync: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    };
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">{icons[name] || icons.document}</svg>;
  };

  const fullScreenBackButton = (
    <button
      type="button"
      onClick={() => setActiveTool(null)}
      className="flex items-center gap-2 text-ink font-semibold text-base min-h-[44px] min-w-[44px] px-2 -ml-2"
      aria-label="Back to tools"
    >
      <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      Back to tools
    </button>
  );

  if (archView === 'tools' && activeTool) {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {/* Safe area spacer so back bar is never cut off by notch */}
        <div style={{ height: 'max(1rem, env(safe-area-inset-top))', minHeight: 'max(1rem, env(safe-area-inset-top))' }} aria-hidden />
        <div className="flex items-center border-b border-ink/20 px-4 py-3 shrink-0 min-h-[52px]">
          {fullScreenBackButton}
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTool === 'notepad' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-ink/20 shrink-0">
                <h4 className="text-sm font-semibold text-ink">Field Notepad</h4>
              </div>
              <div className="flex flex-1 min-h-0 flex-col sm:flex-row overflow-hidden">
                <div className="w-full sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-ink/20 flex flex-row sm:flex-col bg-ink/5 overflow-x-auto sm:overflow-x-visible">
                  <button type="button" onClick={handleNewNote} className="min-h-[44px] shrink-0 p-3 sm:p-2 border-b-0 sm:border-b sm:border-r sm:border-r-0 border-ink/20 text-sm font-medium bg-ink text-white hover:opacity-90">
                    + New note
                  </button>
                  <div className="flex-1 overflow-y-auto p-2 flex sm:block gap-2 sm:gap-0 flex-row sm:flex-col">
                    {savedNotes.length === 0 ? (
                      <p className="text-xs text-ink/50 p-2">No saved notes</p>
                    ) : (
                      savedNotes.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleSelectNote(n)}
                          className={`shrink-0 sm:shrink min-h-[44px] w-full min-w-[120px] sm:min-w-0 text-left p-3 sm:p-2 mb-0 sm:mb-1 rounded-lg text-xs font-medium transition-colors ${activeNoteId === n.id ? 'bg-ink text-white border border-ink' : 'border border-ink/20 bg-white text-ink hover:bg-ink/5'}`}
                        >
                          <span className="block truncate">{n.title || 'Untitled'}</span>
                          <span className="block text-[10px] opacity-70 mt-0.5">{new Date(n.updatedAt).toLocaleDateString()}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
                  <textarea value={note} onChange={handleNoteChange} placeholder="Enter field observations…" className="flex-1 min-h-[200px] w-full rounded-xl border border-ink/20 p-4 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20 resize-none" />
                  <div className="flex justify-between items-center gap-2 mt-3 flex-wrap">
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSaveNote} className="min-h-[44px] rounded-xl bg-ink text-white px-4 py-3 text-sm font-medium hover:opacity-90">Save note</button>
                      {activeNoteId && (
                        <button type="button" onClick={handleDeleteNote} className="min-h-[44px] rounded-xl border border-rose-500 text-rose-600 px-4 py-3 text-sm font-medium hover:bg-rose-50">Delete</button>
                      )}
                    </div>
                    <span className="text-xs text-ink/50">{note.length} chars</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTool === 'compass' && (
            <div className="flex-1 overflow-y-auto flex flex-col items-center p-6">
              <div className="relative w-48 h-48 rounded-full flex items-center justify-center bg-white border border-ink/20 shadow-[0_2px_12px_rgba(44,40,37,0.08)]">
                <div className="absolute inset-0 transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-heading}deg)` }}>
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 font-semibold text-rose-500 text-sm">N</span>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-semibold text-ink/70 text-sm">S</span>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 font-semibold text-ink/70 text-sm">W</span>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-semibold text-ink/70 text-sm">E</span>
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute top-0 left-1/2 w-0.5 h-3 bg-ink/30 rounded -translate-x-1/2 origin-[0_96px]" style={{ transform: `rotate(${i * 30}deg)` }} />
                  ))}
                </div>
                <div className="relative w-1 h-32 bg-rose-500 z-10 before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:border-l-[6px] before:border-l-transparent before:border-r-[6px] before:border-r-transparent before:border-b-[12px] before:border-b-rose-500 shadow-lg rounded-full"></div>
                <div className="absolute w-4 h-4 bg-ink rounded-full border-2 border-white z-20 shadow"></div>
              </div>
              <div className="mt-8 text-center">
                <div className="text-3xl font-bold text-ink">{Math.round(heading)}°</div>
                <div className="text-xs text-ink/60 mt-1">{hasOrientation ? 'Calibrated' : 'Calibrating…'}</div>
              </div>
              <div className="mt-6 w-full p-4 rounded-xl bg-ink/5 border border-ink/20 text-xs text-ink/80 text-center">
                {compassError ? <span className="text-rose-600">{compassError}</span> : hasOrientation ? 'Compass calibrated.' : 'Waiting for device orientation data.'}
              </div>
            </div>
          )}
          {activeTool === '3d-scanner' && (
            <Scanner3D onBack={() => setActiveTool(null)} />
          )}
          {activeTool === 'report' && (
            <ReportSyntaxTemplates onBack={() => setActiveTool(null)} profile={profile} />
          )}
          {activeTool === 'ceramic' && (
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-xs text-ink/60 mb-3">+1 records a piece and your current GPS location.</p>
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="w-24 h-24 rounded-2xl border border-ink/20 flex items-center justify-center bg-amber-50/80 shadow-[0_2px_12px_rgba(44,40,37,0.08)]">
                  <span className="text-4xl font-bold tabular-nums text-ink">{ceramicCount}</span>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleCeramicAddOne} className="min-h-[44px] rounded-xl bg-ink text-white px-6 py-3 text-sm font-medium hover:opacity-90">+1</button>
                  <button type="button" onClick={() => { setCeramicCount(0); setCurrentSessionPieces([]); setCeramicGeoError(''); }} className="min-h-[44px] rounded-xl border border-ink/20 text-ink px-4 py-3 text-sm font-medium hover:bg-ink/5">Reset</button>
                </div>
                {ceramicGeoError && <p className="text-xs text-rose-600">{ceramicGeoError}</p>}
              </div>
              <div className="space-y-2 mb-3">
                <label className="text-xs font-medium text-ink/70 block">Site dimensions (optional)</label>
                <div className="flex gap-2">
                  <input type="number" min="0" step="0.1" value={ceramicDimensionLength} onChange={(e) => setCeramicDimensionLength(e.target.value)} placeholder="Length (m)" className="flex-1 min-w-0 rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
                  <input type="number" min="0" step="0.1" value={ceramicDimensionWidth} onChange={(e) => setCeramicDimensionWidth(e.target.value)} placeholder="Width (m)" className="flex-1 min-w-0 rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-ink/70 block">Field / area (optional)</label>
                <input type="text" value={ceramicSessionLabel} onChange={(e) => setCeramicSessionLabel(e.target.value)} placeholder="e.g. Grid A1" className="w-full rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
                <button type="button" onClick={handleSaveCeramicSession} disabled={ceramicCount === 0} className="w-full rounded-xl bg-amber-500 text-ink py-3 text-sm font-medium border border-ink/20 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed">Save session ({ceramicCount})</button>
              </div>
              <div className="border-t border-ink/20 pt-3">
                <p className="text-xs font-medium text-ink/70 mb-2">Saved sessions</p>
                {ceramicSessions.length === 0 ? (
                  <p className="text-xs text-ink/50">No sessions yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {ceramicSessions.map(s => (
                      <li key={s.id} className="rounded-xl border border-ink/20 p-3 bg-white shadow-[0_2px_8px_rgba(44,40,37,0.06)] flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{s.label}</p>
                          <p className="text-xs text-ink/50">{s.count} pcs · {new Date(s.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button type="button" onClick={() => handleUseCeramicSessionCount(s.count)} className="text-xs font-medium rounded-lg border border-ink/20 px-2.5 py-1 text-ink hover:bg-ink/5">Use</button>
                          <button type="button" onClick={() => handleDeleteCeramicSession(s.id)} className="text-xs font-medium rounded-lg border border-rose-500 text-rose-600 px-2.5 py-1 hover:bg-rose-50">Del</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (archView === 'tools') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-24 md:pb-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setArchView('dashboard')} className="flex items-center gap-1.5 text-ink/80 hover:text-ink font-medium text-sm min-h-[44px]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to dashboard
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink text-center">Professional Tools</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {professionalTools.filter((tool) => !(tool.id === 'ceramic' && isDesktop) && !(tool.id === 'compass' && isDesktop)).map((tool) => {
            const active = (tool.id === 'notepad' && activeTool === 'notepad') || (tool.id === 'compass' && activeTool === 'compass') || (tool.id === 'ceramic' && activeTool === 'ceramic') || (tool.id === '3d-ill' && activeTool === '3d-scanner') || (tool.id === 'report' && activeTool === 'report');
            const hasAction = typeof tool.action === 'function';
            return (
              <button
                key={tool.id}
                type="button"
                onClick={hasAction ? tool.action : undefined}
                disabled={!hasAction}
                className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-colors min-h-[120px] ${
                  hasAction
                    ? active
                      ? 'bg-ink/10 border-ink/30 text-ink shadow-sm'
                      : 'bg-white border-ink/20 text-ink hover:bg-ink/5 hover:border-ink/30 shadow-[0_2px_12px_rgba(44,40,37,0.08)]'
                    : 'bg-white/60 border-ink/10 text-ink/50 cursor-not-allowed'
                }`}
              >
                <div className={`rounded-xl p-3 ${active ? 'bg-ink/15' : 'bg-ink/10'}`}>
                  <ToolIcon name={tool.icon} className="w-8 h-8 text-ink/80" />
                </div>
                <span className="text-xs font-medium text-center leading-tight">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24 md:pb-0">
      <h1 className="text-xl sm:text-2xl font-bold text-ink text-center">Archeologists&apos; Dashboard</h1>

      <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-ink/20 px-3 py-2.5 shadow-sm max-w-md mx-auto">
        <svg className="w-4 h-4 text-ink/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          placeholder="Search"
          value={archSearch}
          onChange={(e) => setArchSearch(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder-ink/50 outline-none"
        />
      </div>

      <section>
        <h2 className="text-base font-bold text-ink mb-3">Recent Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recentActivityItems.slice(0, 2).map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={item.siteId ? () => { if (typeof onOpenJournal === 'function') onOpenJournal(item.siteId); else window.open(`/?view=journal&siteId=${item.siteId}`, '_blank'); } : undefined}
              className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-4 text-left flex gap-3 hover:bg-white/95 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-ink/10 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-ink/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink text-sm">{item.title}</p>
                <p className="text-xs text-ink/60 mt-0.5">{item.secondary}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <h2 className="text-sm font-semibold text-ink">Explore Sites</h2>
          </div>
          <div className="px-4 pb-2 min-h-[200px]">
            <div className="relative z-0 rounded-xl overflow-hidden border border-ink/10 h-[200px] isolate">
              <MiniMapWidget profile={profile} onOpenMap={onNavigateToMap} />
            </div>
            <button type="button" onClick={() => onNavigateToMap?.()} className="mt-2 text-sm font-medium text-ink/80 hover:text-ink flex items-center gap-1">
              Map <span aria-hidden>→</span>
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <h2 className="text-sm font-semibold text-ink">Upcoming Activity</h2>
          </div>
          <div className="px-4 pb-4">
            <div className="flex gap-1 justify-center mb-2">
              {dayLabels.map((d, i) => (
                <span key={i} className="text-[10px] font-medium text-ink/60 w-8 text-center">{d}</span>
              ))}
            </div>
            <div className="flex gap-1 justify-center flex-wrap">
              {sampleDates.map((d) => (
                <span key={d} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium ${highlightedDates.includes(d) ? 'bg-ink text-white' : 'bg-ink/10 text-ink/70'}`}>{d}</span>
              ))}
            </div>
            <button type="button" className="mt-3 text-sm font-medium text-ink/80 hover:text-ink flex items-center gap-1">
              View Calendar <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={() => navigate('/statistics')}
          className="rounded-xl bg-white border border-ink/20 shadow-sm px-5 py-3 flex items-center gap-2 hover:bg-white/95 text-ink font-medium text-sm"
        >
          <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" /></svg>
          Analytics
        </button>
        <button type="button" onClick={() => setArchView('tools')} className="rounded-xl bg-white border border-ink/20 shadow-sm px-5 py-3 flex items-center gap-2 hover:bg-white/95 text-ink font-medium text-sm">
          <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Tools
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof onOpenArchives === 'function') {
              onOpenArchives();
            } else {
              setShowArchivesPanel(true);
            }
          }}
          className="rounded-xl bg-white border border-ink/20 shadow-sm px-5 py-3 flex items-center gap-2 hover:bg-white/95 text-ink font-medium text-sm"
        >
          <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          Archives
        </button>
        <button type="button" onClick={() => setSocialHubPanel('chat')} className="rounded-xl bg-white border border-ink/20 shadow-sm px-5 py-3 flex items-center gap-2 hover:bg-white/95 text-ink font-medium text-sm">
          <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          AI Assistant
        </button>
        {!isDesktop && typeof onOpenSocial === 'function' && (
          <button type="button" onClick={() => onOpenSocial()} className="rounded-xl bg-white border border-ink/20 shadow-sm px-5 py-3 flex items-center gap-2 hover:bg-white/95 text-ink font-medium text-sm">
            <svg className="w-5 h-5 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v2l-2-2v-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v2l2-2v4" /></svg>
            Social Hub
          </button>
        )}
      </section>

      {showArchivesPanel && (
        <section className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-4 max-h-[400px] flex flex-col">
          <h3 className="text-sm font-semibold text-ink mb-3">Archives</h3>
          {archiveLoading ? (
            <p className="text-xs text-ink/50 animate-pulse">Loading records...</p>
          ) : archiveEntries.length === 0 ? (
            <p className="text-xs text-ink/50">No records yet.</p>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1">
              {archiveEntries.map(entry => (
                <button key={entry.id} type="button" onClick={() => { if (typeof onOpenJournal === 'function') onOpenJournal(entry.site_id); else window.open(`/?view=journal&siteId=${entry.site_id}`, '_blank'); }} className="w-full text-left rounded-lg border border-ink/10 p-3 hover:bg-ink/5 text-sm text-ink">
                  <span className="font-medium block">{entry.sites?.name}</span>
                  <span className="text-xs text-ink/60 truncate block">{entry.findings || entry.notes?.slice(0, 50) || 'Entry'}…</span>
                  <span className="text-[10px] text-ink/50 block mt-0.5">{new Date(entry.created_at).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-4">
          <h2 className="text-base font-bold text-ink mb-3">Team</h2>
          <ul className="space-y-2">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ink/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">User {i}</p>
                  <p className="text-xs text-ink/50">Secondary text</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-4">
          <h2 className="text-base font-bold text-ink mb-3">Social Activity</h2>
          <div className="space-y-3">
            {[
              { user: 'User3', time: '2h ago', likes: 16, text: 'Excited to be starting a new dig site in Jordan! Hoping to uncover some interesting artifacts.', likesBottom: 24, comments: 8 },
              { user: 'User3', time: '2h ago', likes: 16, text: 'Excited to be starting a new dig site in Jordan! Hoping to uncover some interesting artifacts.', likesBottom: 24, comments: 8 },
            ].map((post, i) => (
              <button key={i} type="button" onClick={() => setSocialHubPanel('forum')} className="w-full text-left rounded-xl border border-ink/10 p-3 hover:bg-ink/5 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-ink/10" />
                    <span className="text-sm font-medium text-ink">{post.user}</span>
                  </div>
                  <span className="text-xs text-ink/50">{post.time}</span>
                </div>
                <p className="text-xs text-ink/70 mt-2 leading-snug">{post.text}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-ink/50">
                  <span>❤️ {post.likesBottom}</span>
                  <span>💬 {post.comments}</span>
                  <span aria-hidden>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {isChief && (
        <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-ink/10">
          <button type="button" onClick={() => setIsInboxOpen(true)} className="rounded-xl bg-ink text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
            Inbox
            {requests.filter(r => r.status === 'Pending').length > 0 && (
              <span className="bg-white text-ink text-xs px-1.5 py-0.5 rounded-full">{requests.filter(r => r.status === 'Pending').length}</span>
            )}
          </button>
          <button type="button" onClick={() => setIsSiteFormOpen(true)} className="rounded-xl bg-white border border-ink/20 text-ink px-4 py-2.5 text-sm font-medium hover:bg-ink/5">
            + Register New Dig Site
          </button>
        </div>
      )}

      {/* Inbox Modal */}
      {isInboxOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-start justify-center p-4 sm:p-6 overflow-y-auto" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="bg-white rounded-2xl border border-ink/10 w-full max-w-4xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] p-6 sm:p-8 relative my-4 sm:my-10">
            <button
              type="button"
              onClick={() => setIsInboxOpen(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-sm font-medium text-ink/60 hover:text-ink rounded-xl hover:bg-ink/5 px-2 py-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              Close
            </button>

            <div className="mb-6 flex justify-between items-center flex-wrap gap-2 pr-14 sm:pr-16">
              <div>
                <h3 className="text-xl font-bold text-ink">Expedition Inbox</h3>
                <p className="text-xs text-ink/60 mt-0.5">Reviewing field personnel requests</p>
              </div>
              <button onClick={fetchRequests} className="text-sm font-medium text-ink/70 hover:text-ink rounded-lg border border-ink/20 px-3 py-1.5 hover:bg-ink/5">
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {requestsLoading ? (
                <div className="p-12 text-center text-sm text-ink/60 animate-pulse">Loading requests…</div>
              ) : requests.length === 0 ? (
                <div className="p-12 rounded-xl border border-ink/20 border-dashed text-center text-sm text-ink/50 bg-ink/5">
                  No pending requests in the queue.
                </div>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="rounded-xl border border-ink/20 p-5 sm:p-6 bg-white shadow-[0_2px_12px_rgba(44,40,37,0.06)] flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${req.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : req.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                          {req.status}
                        </span>
                        <span className="text-xs text-ink/50">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-ink text-base leading-tight">
                        <span className="text-ink/60 font-medium">From:</span> {req.profiles?.full_name} (@{req.profiles?.username})
                      </h4>
                      <p className="text-sm text-ink/70">
                        <span className="text-ink/50">Assignment:</span> {req.sites?.name}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 py-4 border-t border-b border-ink/10">
                        <div>
                          <span className="text-[10px] font-medium text-ink/50 uppercase block mb-0.5">Experience</span>
                          <span className="text-sm font-medium text-ink">{req.experience_years} years</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-ink/50 uppercase block mb-0.5">Specialization</span>
                          <span className="text-sm font-medium text-ink">{req.specialization}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-ink/50 uppercase block mb-0.5">Availability</span>
                          <span className="text-sm font-medium text-ink">{req.availability}</span>
                        </div>
                      </div>

                      {req.message && (
                        <div className="mt-4 p-3 rounded-lg bg-ink/5 border border-ink/20 text-sm text-ink/80 italic">
                          "{req.message}"
                        </div>
                      )}

                      {req.status === 'Approved' && (
                        <button
                          onClick={() => { if (typeof onOpenJournal === 'function') onOpenJournal(req.site_id); else window.open(`/?view=journal&siteId=${req.site_id}`, '_blank'); }}
                          className="mt-4 text-sm font-medium text-ink hover:underline"
                        >
                          Open Field Terminal →
                        </button>
                      )}
                    </div>

                    {req.status === 'Pending' && (
                      <div className="flex flex-row md:flex-col gap-2 justify-end shrink-0">
                        <button
                          onClick={() => handleRequestAction(req.id, 'Approved')}
                          className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, 'Rejected')}
                          className="rounded-xl border border-red-300 bg-red-50 text-red-700 px-4 py-2.5 text-sm font-medium hover:bg-red-100 transition-colors"
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

      {/* AI Assistant: no wrapper so no white box behind popup */}
      {socialHubPanel === 'chat' && (
        <AIAssistant profile={profile} embedded open onClose={() => setSocialHubPanel(null)} />
      )}

      {/* Social Hub modals (Forum, etc.) */}
      {socialHubPanel && socialHubPanel !== 'chat' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-ink/20 w-full max-w-2xl shadow-[0_8px_32px_rgba(44,40,37,0.15)] p-10 relative my-10">
            <button
              onClick={() => setSocialHubPanel(null)}
              className="absolute top-6 right-6 text-sm font-medium text-ink/60 hover:text-ink rounded-xl hover:bg-ink/5 px-2 py-1"
              aria-label="Close"
            >
              Close
            </button>

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
        <div className="fixed z-[100] flex flex-col bg-white rounded-2xl border border-ink/20 shadow-[0_8px_32px_rgba(44,40,37,0.15)] max-h-[90vh] w-[calc(100%-2rem)] max-w-[90vw] sm:max-w-none sm:w-80 sm:top-24 sm:right-8 top-[max(5rem,env(safe-area-inset-top))] left-4 right-4 sm:left-auto p-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="flex justify-between items-center mb-4 border-b border-ink/20 pb-3">
            <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              Ceramic Counter
            </h4>
            <button type="button" onClick={handleCeramicCounterToggle} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-ink/60 hover:text-ink rounded-xl hover:bg-ink/5" aria-label="Close">Close</button>
          </div>
          <p className="text-xs text-ink/60 mb-3">+1 records a piece and your GPS location (allow location when prompted).</p>
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-24 h-24 rounded-2xl border border-ink/20 flex items-center justify-center bg-amber-50/80 shadow-[0_2px_12px_rgba(44,40,37,0.08)]">
              <span className="text-4xl font-bold tabular-nums text-ink">{ceramicCount}</span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleCeramicAddOne} className="min-h-[44px] rounded-xl bg-ink text-white px-6 py-3 text-sm font-medium hover:opacity-90">+1</button>
              <button type="button" onClick={() => { setCeramicCount(0); setCurrentSessionPieces([]); setCeramicGeoError(''); }} className="min-h-[44px] rounded-xl border border-ink/20 text-ink px-4 py-3 text-sm font-medium hover:bg-ink/5">Reset</button>
            </div>
            {currentSessionPieces.length > 0 && <p className="text-xs text-amber-700">{currentSessionPieces.filter(p => p.lat != null).length}/{currentSessionPieces.length} with location</p>}
            {ceramicGeoError && <p className="text-xs text-rose-600">{ceramicGeoError}</p>}
          </div>
          <div className="space-y-2 mb-3">
            <label className="text-xs font-medium text-ink/70 block">Site dimensions (optional)</label>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.1" value={ceramicDimensionLength} onChange={(e) => setCeramicDimensionLength(e.target.value)} placeholder="Length (m)" className="flex-1 min-w-0 rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
              <input type="number" min="0" step="0.1" value={ceramicDimensionWidth} onChange={(e) => setCeramicDimensionWidth(e.target.value)} placeholder="Width (m)" className="flex-1 min-w-0 rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <label className="text-xs font-medium text-ink/70 block">Field / area (optional)</label>
            <input type="text" value={ceramicSessionLabel} onChange={(e) => setCeramicSessionLabel(e.target.value)} placeholder="e.g. Grid A1, Trench 2" className="w-full rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
            <button type="button" onClick={handleSaveCeramicSession} disabled={ceramicCount === 0} className="w-full rounded-xl bg-amber-500 text-ink py-3 text-sm font-medium border border-ink/20 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed">Save session ({ceramicCount})</button>
          </div>
          <div className="border-t border-ink/20 pt-3 flex-1 min-h-0 flex flex-col">
            <p className="text-xs font-medium text-ink/70 mb-2">Saved sessions</p>
            {ceramicSessions.length === 0 ? (
              <p className="text-xs text-ink/50">No sessions yet. Count and save above.</p>
            ) : (
              <ul className="space-y-2 overflow-y-auto max-h-48">
                {ceramicSessions.map(s => (
                  <li key={s.id} className="rounded-xl border border-ink/20 p-3 bg-white shadow-[0_2px_8px_rgba(44,40,37,0.06)] flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{s.label}</p>
                      <p className="text-xs text-ink/50">{s.count} pcs{(s.lengthM != null || s.widthM != null) && ` · ${s.lengthM ?? '?'}×${s.widthM ?? '?'} m`}{s.pieces?.length > 0 && ` · ${s.pieces.filter(p => p.lat != null).length} locations`} · {new Date(s.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => handleUseCeramicSessionCount(s.count)} className="text-xs font-medium rounded-lg border border-ink/20 px-2.5 py-1 text-ink hover:bg-ink/5">Use</button>
                      <button type="button" onClick={() => handleDeleteCeramicSession(s.id)} className="text-xs font-medium rounded-lg border border-rose-500 text-rose-600 px-2.5 py-1 hover:bg-rose-50">Del</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-ink/50 mt-3 text-center">Use → opens Register New Expedition with this count.</p>
        </div>
      )}

      {/* Compass UI */}
      {isCompassOpen && (
        <div className="fixed z-[100] bg-white rounded-2xl border border-ink/20 shadow-[0_8px_32px_rgba(44,40,37,0.15)] p-6 sm:p-8 flex flex-col items-center w-[calc(100%-2rem)] max-w-[90vw] sm:max-w-none sm:w-80 sm:top-24 sm:left-8 top-[max(5rem,env(safe-area-inset-top))] left-4 right-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="flex justify-between items-center w-full mb-6 border-b border-ink/20 pb-3">
            <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              Field Compass
            </h4>
            <button type="button" onClick={handleCompassToggle} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-ink/60 hover:text-ink rounded-xl hover:bg-ink/5" aria-label="Close">Close</button>
          </div>
          <div className="relative w-48 h-48 rounded-full flex items-center justify-center bg-white border border-ink/20 shadow-[0_2px_12px_rgba(44,40,37,0.08)]">
            <div className="absolute inset-0 transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-heading}deg)` }}>
              <span className="absolute top-2 left-1/2 -translate-x-1/2 font-semibold text-rose-500 text-sm">N</span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-semibold text-ink/70 text-sm">S</span>
              <span className="absolute left-2 top-1/2 -translate-y-1/2 font-semibold text-ink/70 text-sm">W</span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 font-semibold text-ink/70 text-sm">E</span>
              {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute top-0 left-1/2 w-0.5 h-3 bg-ink/30 rounded -translate-x-1/2 origin-[0_96px]" style={{ transform: `rotate(${i * 30}deg)` }} />
              ))}
            </div>
            <div className="relative w-1 h-32 bg-rose-500 z-10 before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:border-l-[6px] before:border-l-transparent before:border-r-[6px] before:border-r-transparent before:border-b-[12px] before:border-b-rose-500 shadow-lg rounded-full"></div>
            <div className="absolute w-4 h-4 bg-ink rounded-full border-2 border-white z-20 shadow"></div>
          </div>
          <div className="mt-8 text-center">
            <div className="text-3xl font-bold text-ink">{Math.round(heading)}°</div>
            <div className="text-xs text-ink/60 mt-1">{hasOrientation ? 'Calibrated' : 'Calibrating…'}</div>
          </div>
          <div className="mt-6 w-full p-4 rounded-xl bg-ink/5 border border-ink/20 text-xs text-ink/80 text-center">
            {compassError ? <span className="text-rose-600">{compassError}</span> : hasOrientation ? 'Compass calibrated. Align device flat for best accuracy.' : 'Waiting for device orientation. (Requires mobile with magnetometer)'}
          </div>
          {typeof window !== 'undefined' && !window.isSecureContext && !compassError && (
            <div className="mt-2 text-xs text-rose-600 text-center">Sensors require HTTPS or localhost</div>
          )}
        </div>
      )}

      {/* Notepad UI - Saved notes + editor */}
      {isNotepadOpen && (
        <div className="fixed z-[100] flex flex-col bg-white rounded-2xl border border-ink/20 shadow-[0_8px_32px_rgba(44,40,37,0.15)] max-h-[85vh] w-[calc(100%-1rem)] max-w-[95vw] sm:max-w-2xl sm:top-24 sm:right-8 top-[max(5rem,env(safe-area-inset-top))] left-2 right-2 sm:left-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex justify-between items-center p-4 border-b border-ink/20 min-h-[52px]">
            <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              Field Notepad
            </h4>
            <button type="button" onClick={handleNotepadToggle} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-ink/60 hover:text-ink rounded-xl hover:bg-ink/5" aria-label="Close">Close</button>
          </div>
          <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
            <div className="w-full sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-ink/20 flex flex-row sm:flex-col bg-ink/5 overflow-x-auto sm:overflow-x-visible">
              <button type="button" onClick={handleNewNote} className="min-h-[44px] shrink-0 p-3 sm:p-2 border-b-0 sm:border-b sm:border-r sm:border-r-0 border-ink/20 text-sm font-medium text-white bg-ink hover:opacity-90 rounded-none sm:rounded-none">
                + New note
              </button>
              <div className="flex-1 overflow-y-auto overflow-x-auto sm:overflow-x-visible p-2 flex sm:block gap-2 sm:gap-0 flex-row sm:flex-col">
                {savedNotes.length === 0 ? (
                  <p className="text-xs text-ink/50 p-2">No saved notes</p>
                ) : (
                  savedNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleSelectNote(n)}
                      className={`shrink-0 sm:shrink min-h-[44px] w-full min-w-[120px] sm:min-w-0 text-left p-3 sm:p-2 mb-0 sm:mb-1 rounded-lg text-xs font-medium transition-colors ${activeNoteId === n.id ? 'bg-ink text-white border border-ink' : 'border border-ink/20 bg-white text-ink hover:bg-ink/5'}`}
                    >
                      <span className="block truncate">{n.title || 'Untitled'}</span>
                      <span className="block text-[10px] opacity-70 mt-0.5">{new Date(n.updatedAt).toLocaleDateString()}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col p-4 min-w-0">
              <textarea
                value={note}
                onChange={handleNoteChange}
                placeholder="Enter field observations…"
                className="flex-1 min-h-[200px] w-full rounded-xl border border-ink/20 p-4 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20 resize-none"
              />
              <div className="flex justify-between items-center gap-2 mt-3 flex-wrap">
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveNote} className="min-h-[44px] rounded-xl bg-ink text-white px-4 py-3 text-sm font-medium hover:opacity-90">
                    Save note
                  </button>
                  {activeNoteId && (
                    <button type="button" onClick={handleDeleteNote} className="min-h-[44px] rounded-xl border border-rose-500 text-rose-600 px-4 py-3 text-sm font-medium hover:bg-rose-50">
                      Delete
                    </button>
                  )}
                </div>
                <span className="text-xs text-ink/50">{note.length} chars</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ArchZone;
