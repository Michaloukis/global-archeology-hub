import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import SitesMap from './components/SitesMap'
import ArchZone from './components/ArchZone'
import EducationZone from './components/EducationZone'
import JournalTerminal from './components/JournalTerminal'

// #region agent log
const logData = (msg, data, hypothesisId) => {
  fetch('http://127.0.0.1:7243/ingest/681b1f5c-17b9-4cf5-8463-2a620377b7c6',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({location:'App.jsx',message:msg,data,timestamp:Date.now(),sessionId:'debug-session',hypothesisId})
  }).catch(()=>{});
};
// #endregion

const HomePage = ({ searchQuery }) => {
  const articles = [
    {
      id: 'ARCH_2025_001',
      title: 'Massive Mayan City "Valeriana" Discovered via Lidar in Mexico',
      summary: 'Archaeologists have discovered a hidden Mayan city covering nearly 16.6 square kilometers, featuring pyramids, sports fields, and amphitheaters.',
      source: 'SMITHSONIAN',
      date: 'OCT 2025',
      url: 'https://www.smithsonianmag.com/smart-news/archaeologists-discover-massive-lost-maya-city-mexico-using-lidar-180985356/'
    },
    {
      id: 'ARCH_2025_002',
      title: 'Rare 4,000-Year-Old Circular Structure Found on Crete Hilltop',
      summary: 'A unique Minoan building of "monumental" proportions has been unearthed during airport construction on Papoura Hill near Kastelli.',
      source: 'SMITHSONIAN',
      date: 'JUN 2024',
      url: 'https://www.smithsonianmag.com/smart-news/monumental-4000-year-old-circular-labyrinth-unearthed-greek-island-180984534/'
    },
    {
      id: 'ARCH_2025_003',
      title: 'Pompeii: Uncovering the "House of the Painters at Work"',
      summary: 'New excavations have revealed remarkably preserved frescoes and tools left behind by workers during the eruption of AD 79.',
      source: 'SMITHSONIAN',
      date: 'MAY 2024',
      url: 'https://www.smithsonianmag.com/smart-news/paintbrushes-bowls-pigment-unearthed-pompeii-180984442/'
    }
  ];

  const handleArticleClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="border-4 border-black p-10 bg-white">
          <h3 className="text-3xl font-black uppercase tracking-tighter mb-6 border-b-2 border-black pb-4">Latest Reports</h3>
          <div className="space-y-8">
            {articles.map(article => (
              <div 
                key={article.id} 
                onClick={() => handleArticleClick(article.url)}
                className="group cursor-pointer border-b border-gray-100 last:border-0 pb-6 last:pb-0 hover:bg-gray-50 p-4 -m-4 transition-all"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5">{article.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400">{article.date}</span>
                    <div className="bg-black text-white px-1.5 py-0.5 text-[8px] font-black uppercase group-hover:bg-red-600">OPEN_LINK</div>
                  </div>
                </div>
                <h4 className="font-black uppercase text-xl group-hover:underline leading-tight text-black">{article.title}</h4>
                <p className="text-xs text-gray-500 font-bold uppercase mt-2 leading-relaxed">{article.summary}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-4 border-black p-10 bg-gray-50">
          <h3 className="text-3xl font-black uppercase tracking-tighter mb-6 border-b-2 border-black pb-4">Global Events</h3>
          <div className="space-y-6">
            {[
              { title: 'International Seminar on Lidar Tech', day: '12', month: 'FEB', loc: 'Virtual Hub' },
              { title: 'Field Expedition: Giza Plateau', day: '24', month: 'MAR', loc: 'Cairo, Egypt' },
              { title: 'Lab Workshop: Carbon Dating 2.0', day: '05', month: 'APR', loc: 'London, UK' }
            ].map(e => (
              <div key={e.title} className="flex gap-6 items-center border-b border-gray-200 pb-4 last:border-0">
                <div className="bg-black text-white p-3 text-center min-w-[60px]">
                  <div className="text-xs font-black">{e.month}</div>
                  <div className="text-xl font-black">{e.day}</div>
                </div>
                <div>
                  <h4 className="font-black uppercase text-sm">{e.title}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Location: {e.loc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('home') 
  const [searchQuery, setSearchQuery] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [lastScrollTime, setLastScrollTime] = useState(Date.now())
  const [activeSiteId, setActiveSiteId] = useState(null)

  useEffect(() => {
    // Basic Routing Logic for New Tab / Sharing
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    const siteParam = params.get('siteId')

    if (viewParam === 'journal' && siteParam) {
      setView('journal')
      setActiveSiteId(siteParam)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const currentTime = Date.now()
      
      const scrollDiff = currentScrollY - lastScrollY
      const timeDiff = currentTime - lastScrollTime
      
      // Calculate velocity (px/ms)
      // Positive diff = scrolling down, Negative diff = scrolling up
      const velocity = timeDiff > 0 ? scrollDiff / timeDiff : 0

      if (currentScrollY < 20) {
        setIsVisible(true)
      } else if (scrollDiff > 0) {
        // Scrolling down: hide header
        setIsVisible(false)
      } else if (scrollDiff < 0) {
        // Scrolling up: check for "flick" speed
        // If speed is > 2.5px/ms (a sharp flick), show header
        if (Math.abs(velocity) > 2.5) {
          setIsVisible(true)
        }
      }
      
      setLastScrollY(currentScrollY)
      setLastScrollTime(currentTime)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, lastScrollTime])

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)
    }) || { data: { subscription: null } }

    return () => subscription?.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const response = await supabase.from('profiles').select('*').eq('id', userId)
    
    console.log('DEBUG: Profile structure:', response.data?.[0]);

    if (response.error) {
      console.error('Profile fetch error', response.error)
    } else if (response.data && response.data.length > 0) {
      setProfile(response.data[0])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (!session) return <Auth />

  // Access Control Helpers
  const isArcheologist = profile?.role === 'Chief Archeologist' || profile?.role === 'Field Archeologist'
  const isStudent = profile?.role === 'Student'

  const filteredTasks = [] // Placeholder for task manager if added back

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Institutional Top Navigation */}
      <header className={`border-b-4 border-black p-3 md:p-4 fixed top-0 left-0 right-0 bg-white z-50 transition-transform duration-500 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none cursor-pointer" onClick={() => setView('home')}>
              GLOBAL<br />ARCHEOLOGY HUB
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                  <span className="bg-black text-white px-2 py-1">NAME: {profile?.full_name?.toUpperCase() || 'IDENTIFYING...'}</span>
                  <span className="bg-black text-white px-2 py-1">USER: @{profile?.username?.toUpperCase() || 'N/A'}</span>
                  <span className="bg-black text-white px-2 py-1">ACCESS: {profile?.role?.toUpperCase() || 'PENDING...'}</span>
                  {isStudent && (
                    <span className="bg-indigo-600 text-white px-2 py-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white animate-pulse rounded-full"></span>
                      LEVEL: {profile?.education_xp || 0} XP
                    </span>
                  )}
                </div>
              </div>

          <div className="flex flex-col md:flex-row gap-6 items-end w-full lg:w-auto">
            {/* Navigation Search */}
            <div className="relative border-2 border-black flex items-center bg-white w-full md:w-64">
              <div className="pl-3 text-black">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="SYSTEM SEARCH..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none"
              />
            </div>

            {/* Zone-Based Menu */}
            <nav className="flex border-2 border-black font-black text-[10px] uppercase tracking-widest overflow-hidden">
              <button onClick={() => setView('home')} className={`px-3 py-2 border-r-2 border-black ${view === 'home' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Homepage</button>
              <button onClick={() => setView('map')} className={`px-3 py-2 border-r-2 border-black ${view === 'map' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Map</button>
              {isStudent && (
                <button onClick={() => setView('education')} className={`px-3 py-2 border-r-2 border-black ${view === 'education' ? 'bg-black text-white' : 'hover:bg-indigo-50 text-indigo-600'}`}>Edu Lab</button>
              )}
              {isArcheologist && (
                <button onClick={() => setView('arch')} className={`px-3 py-2 border-r-2 border-black ${view === 'arch' ? 'bg-black text-white' : 'hover:bg-red-50 text-red-600'}`}>Arch Zone</button>
              )}
              <button onClick={handleLogout} className="px-3 py-2 hover:bg-black hover:text-white transition-colors">Logout</button>
            </nav>
          </div>
        </div>
      </header>

          <main className="max-w-[1400px] mx-auto p-8 md:p-12 min-h-[70vh] pt-24 md:pt-32 text-left">
            {view === 'home' && <HomePage searchQuery={searchQuery} />}
            {view === 'map' && <SitesMap searchQuery={searchQuery} profile={profile} />}
            {view === 'education' && isStudent && <EducationZone profile={profile} />}
            {view === 'arch' && isArcheologist && <ArchZone profile={profile} onNavigateToMap={() => setView('map')} />}
            {view === 'journal' && activeSiteId && <JournalTerminal siteId={activeSiteId} profile={profile} />}
          </main>

      <footer className="bg-black text-white p-12 mt-20 border-t-8 border-gray-900">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-[10px] font-black uppercase tracking-[0.3em]">
          <div>
            <h4 className="text-gray-500 mb-4 tracking-normal font-bold">SYSTEM_INFO</h4>
            <p>© 2026 GLOBAL ARCHEOLOGY HUB</p>
            <p>UNIT_ID: {session?.user?.id?.substring(0,16).toUpperCase() || 'ANONYMOUS'}</p>
          </div>
          <div>
            <h4 className="text-gray-500 mb-4 tracking-normal font-bold">CLEARANCE_LEVEL</h4>
            <p>{profile?.role?.toUpperCase() || 'STANDARD'} // {isArcheologist ? 'UNRESTRICTED' : 'STANDARD'}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-gray-500 mb-4 tracking-normal font-bold">ZONES_ACTIVE</h4>
            <div className="flex gap-4">
              <span className="text-emerald-500">PUBLIC_HUB</span>
              {isStudent && <span className="text-indigo-500">EDU_LAB</span>}
              {isArcheologist && <span className="text-red-500">ARCH_ZONE</span>}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
