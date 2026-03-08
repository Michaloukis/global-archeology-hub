import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import SitesMap from './components/SitesMap'
import ArchZone from './components/ArchZone'
import EducationZone from './components/EducationZone'
import JournalTerminal from './components/JournalTerminal'
import ArchBotChatBox from './components/ArchBotChatBox'
import QuickStatsWidget from './components/QuickStatsWidget'
import MiniMapWidget from './components/MiniMapWidget'
import Illustrator2DPage from './pages/Illustrator2DPage.jsx'
import Viewer3DPage from './pages/Viewer3DPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import TeamPage from './pages/TeamPage.jsx'
import SocialPage from './pages/SocialPage.jsx'
import ArchivesPage from './pages/ArchivesPage.jsx'
import SocialActivityWidget from './components/SocialActivityWidget'
import { isArcheologist as isArcheologistRole } from './utils/roles'

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

const MOBILE_ACTIVITY = [
  { id: 1, type: 'person', name: 'Dr. Sarah Chen', time: '7 hours ago', description: 'New findings from the Bronze Age settlement in Crete suggest advanced water management systems. Initial carbon dating confirms structures from 1600 BCE.' },
  { id: 2, type: 'event', name: 'Mediterranean Archaeol...', tag: 'Event', time: '5 hours ago', title: 'Virtual Symposium: Recent Discoveries in Underwater Archaeology.', date: 'December 20, 2025', location: 'Online Event', registered: 247 },
  { id: 3, type: 'person', name: 'Prof. James Morrison', time: '1 day ago', description: 'Completed preliminary analysis of ceramic fragments from the Indus Valley site. The glazing techniques show remarkable sophistication for the period.' },
];

const openSocialFromMobile = (setView, chatroomId) => {
  try { if (chatroomId) localStorage.setItem('global-arch-social-selected-chatroom', chatroomId); } catch (_) {}
  setView('social');
};

const MobileDashboard = ({ profile, onOpenMap, onOpenSocial }) => (
  <div className="p-4 pb-28 space-y-6 parchment-main min-h-full">
    <div>
      <h2 className="text-lg font-bold text-ink">The Global Archaeology Hub</h2>
      <p className="text-sm text-ink/70 mt-0.5">A global standardized archaeology data platform</p>
    </div>

    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-sm font-semibold text-ink">Global Sites</span>
        <button type="button" onClick={onOpenMap} className="text-sm font-medium text-ink/80 hover:text-ink flex items-center gap-0.5">
          View Full Map →
        </button>
      </div>
      <div className="px-4 pb-2">
        <div className="aspect-[4/3] rounded-xl overflow-hidden border border-ink/10 min-h-[160px]">
          <MiniMapWidget profile={profile} onOpenMap={onOpenMap} embedded />
        </div>
        <div className="mt-3 flex flex-col gap-0.5">
          <p className="text-xs text-ink/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600/90 shrink-0" aria-hidden /> Active Sites
          </p>
          <p className="text-[11px] text-ink/60">Public-safe data only.</p>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 overflow-hidden min-h-[100px]">
      <div className="p-4 h-full min-h-[120px]">
        <SocialActivityWidget profile={profile} onOpenSocial={onOpenSocial} />
      </div>
    </div>

    <div>
      <h3 className="text-base font-bold text-ink mb-3">Recent Activity</h3>
      <div className="space-y-3">
        {MOBILE_ACTIVITY.map(item => (
          <div key={item.id} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-ink/10 flex items-center justify-center shrink-0">
                <NavIcon name={item.type === 'event' ? 'document' : 'user'} className="w-4 h-4 text-ink/70" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-ink">{item.name}</span>
                  {item.tag && <span className="text-[10px] font-medium text-ink/70 bg-ink/10 px-1.5 py-0.5 rounded">{item.tag}</span>}
                  <span className="text-[11px] text-ink/50">{item.time}</span>
                </div>
                <p className="text-xs text-ink/80 mt-1 leading-snug">{item.description || item.title}</p>
                {item.date && (
                  <div className="mt-2 space-y-0.5 text-[11px] text-ink/60">
                    <p>🗓️ {item.date}</p>
                    <p>🌐 {item.location}</p>
                    <p>👤 {item.registered} registered</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-4">
        <button type="button" className="text-sm font-medium text-ink/80 hover:text-ink">View All Activity</button>
      </div>
    </div>
  </div>
);

const ARTICLES = [
  { id: 'ARCH_2025_001', title: 'Massive Mayan City "Valeriana" Discovered via Lidar in Mexico', summary: 'Archaeologists have discovered a hidden Mayan city covering nearly 16.6 square kilometers.', source: 'SMITHSONIAN', date: 'OCT 2025', url: 'https://www.smithsonianmag.com/smart-news/archaeologists-discover-massive-lost-maya-city-mexico-using-lidar-180985356/', image: 'https://images.unsplash.com/photo-1543716091-a840c05249ec?w=400&h=225&fit=crop' },
  { id: 'ARCH_2025_002', title: 'Rare 4,000-Year-Old Circular Structure Found on Crete Hilltop', summary: 'A unique Minoan building of "monumental" proportions unearthed on Papoura Hill.', source: 'SMITHSONIAN', date: 'JUN 2024', url: 'https://www.smithsonianmag.com/smart-news/monumental-4000-year-old-circular-labyrinth-unearthed-greek-island-180984534/', image: 'https://images.unsplash.com/photo-1573843981267-be1999f9e4e5?w=400&h=225&fit=crop' },
  { id: 'ARCH_2025_003', title: 'Pompeii: Uncovering the "House of the Painters at Work"', summary: 'New excavations revealed frescoes and tools left during the eruption of AD 79.', source: 'SMITHSONIAN', date: 'MAY 2024', url: 'https://www.smithsonianmag.com/smart-news/paintbrushes-bowls-pigment-unearthed-pompeii-180984442/', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=225&fit=crop' },
];

function ArticleCardImage({ url, image: explicitImage, alt, className = '' }) {
  const [imageUrl, setImageUrl] = useState(explicitImage || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (explicitImage) {
      setImageUrl(explicitImage);
      return;
    }
    if (!url || failed) return;
    const encoded = encodeURIComponent(url);
    fetch(`https://api.microlink.io?url=${encoded}`)
      .then((res) => res.json())
      .then((data) => {
        const img = data?.data?.image?.url;
        if (img) setImageUrl(img);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [url, explicitImage, failed]);

  const placeholder = (
    <div className={`bg-white/30 rounded-md flex items-center justify-center text-ink/40 border border-ink/20 ${className}`}>
      <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    </div>
  );

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => { setFailed(true); setImageUrl(null); }}
      />
    );
  }
  return placeholder;
}
const EVENTS = [
  { title: 'International Seminar on Lidar Tech', day: '12', month: 'FEB', loc: 'Virtual Hub' },
  { title: 'Field Expedition: Giza Plateau', day: '24', month: 'MAR', loc: 'Cairo, Egypt' },
  { title: 'Lab Workshop: Carbon Dating 2.0', day: '05', month: 'APR', loc: 'London, UK' },
];

const NavIcon = ({ name, className = 'w-5 h-5' }) => {
  const icons = {
    document: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />,
    map: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    wrench: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    toolbox: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10h14v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10V6a2 2 0 012-2h2a2 2 0 012 2v4M9 10h6" /></>,
    people: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    social: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
    cog: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    globe: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-6-6 6 6 0 00-6 6v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    grid: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></>,
  };
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">{icons[name] || icons.document}</svg>;
};

const WIDGET_IDS = ['minimap', 'quickstats', 'archbot', 'global-events', 'social-activity']
const WIDGET_LABELS = { minimap: 'Mini Map', quickstats: 'Quick Stats', archbot: 'ArchBot', 'global-events': 'Global Events', 'social-activity': 'Social Activity' }
const WIDGET_SIZES = ['small', 'medium', 'large']
const SIZE_CLASS = { small: 'h-[100px] min-h-0', medium: 'h-[180px] min-h-0', large: 'h-[260px] min-h-0' }
const SIZE_CLASS_CONTENT = { small: 'min-h-[120px]', medium: 'min-h-[180px]', large: 'min-h-[260px]' }
/** Fixed height so ArchBot inner content can fill and avoid bottom gap */
const SIZE_CLASS_ARCHBOT = { small: 'h-[120px] min-h-0', medium: 'h-[180px] min-h-0', large: 'h-[260px] min-h-0' }
const DEFAULT_HEIGHTS = { small: 100, medium: 180, large: 260 }
const WIDGET_MIN_H = 80
const WIDGET_MAX_H = 480
const WIDGET_MIN_W = 200
const WIDGET_MAX_W = 1200
const WIDGET_GRID_STEP = 40

function snapToGrid(value, step, min, max) {
  const n = Math.round(value / step) * step
  return Math.max(min, Math.min(max, n))
}

const DEFAULT_LAYOUT = [['minimap'], ['quickstats', 'archbot'], ['global-events', 'social-activity']]

function getDefaultWidgetPreferences() {
  const defaultSize = (id) => (['minimap', 'quickstats', 'archbot', 'social-activity'].includes(id) ? 'large' : 'medium')
  return {
    visible: Object.fromEntries(WIDGET_IDS.map(id => [id, true])),
    size: Object.fromEntries(WIDGET_IDS.map(id => [id, defaultSize(id)])),
    customHeight: {},
    customWidth: {},
    lockToGrid: true,
    layout: DEFAULT_LAYOUT.map(row => [...row])
  }
}

function orderToLayout(order) {
  if (!Array.isArray(order) || order.length === 0) return getDefaultWidgetPreferences().layout
  return order.map(id => [id])
}

function loadWidgetPreferences() {
  try {
    const raw = localStorage.getItem('global-archeology-dashboard-widgets')
    if (!raw) return getDefaultWidgetPreferences()
    const parsed = JSON.parse(raw)
    const def = getDefaultWidgetPreferences()
    let layout = def.layout
    if (Array.isArray(parsed.layout) && parsed.layout.length > 0) {
      layout = parsed.layout.map(row => Array.isArray(row) ? row.filter(id => WIDGET_IDS.includes(id)) : []).filter(row => row.length > 0)
      const used = new Set(layout.flat())
      WIDGET_IDS.filter(id => !used.has(id)).forEach(id => layout.push([id]))
    } else if (Array.isArray(parsed.order) && parsed.order.length > 0) {
      layout = orderToLayout(WIDGET_IDS.filter(id => parsed.order.includes(id)).concat(WIDGET_IDS.filter(id => !parsed.order.includes(id))))
    }
    return {
      visible: { ...def.visible, ...(parsed.visible || {}) },
      size: { ...def.size, ...(parsed.size || {}) },
      customHeight: { ...(parsed.customHeight || {}) },
      customWidth: { ...(parsed.customWidth || {}) },
      lockToGrid: parsed.lockToGrid !== undefined ? parsed.lockToGrid : def.lockToGrid,
      layout
    }
  } catch (_) {
    return getDefaultWidgetPreferences()
  }
}

function saveWidgetPreferences(prefs) {
  try {
    localStorage.setItem('global-archeology-dashboard-widgets', JSON.stringify(prefs))
  } catch (_) {}
}

const WIDGET_ICONS = {
  minimap: 'map',
  quickstats: 'chart',
  archbot: 'user',
  'global-events': 'bell',
  'social-activity': 'social'
}

function ResizableWidgetBox({ id, editMode, height, width: customWidthPx, minH, onResize, onResizeWidth, onRemove, onDragHandleStart, onDragHandleEnd, sizeKey, sizeClassMap, contentClassMap, noPadding, children }) {
  const boxRef = useRef(null)
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0, handle: '' })

  const getHeight = () => {
    if (editMode && height != null) return height
    const sz = sizeKey || 'medium'
    return DEFAULT_HEIGHTS[sz] ?? 180
  }
  const getWidth = () => {
    if (editMode && customWidthPx != null) return customWidthPx
    const el = boxRef.current
    return el ? el.getBoundingClientRect().width : 400
  }

  const onResizeStart = useCallback((e, handle) => {
    e.stopPropagation()
    const el = boxRef.current
    const rect = el?.getBoundingClientRect()
    const currentW = customWidthPx != null ? customWidthPx : (rect?.width ?? 400)
    const currentH = height != null ? height : (rect?.height ?? getHeight())
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: currentW,
      h: currentH,
      handle
    }
    const onMove = (e2) => {
      const dx = e2.clientX - resizeStartRef.current.x
      const dy = e2.clientY - resizeStartRef.current.y
      let { w, h } = resizeStartRef.current
      const hdl = resizeStartRef.current.handle
      const minHVal = minH ?? WIDGET_MIN_H
      if (hdl.includes('e')) w = Math.max(WIDGET_MIN_W, Math.min(WIDGET_MAX_W, w + dx))
      if (hdl.includes('w')) w = Math.max(WIDGET_MIN_W, Math.min(WIDGET_MAX_W, w - dx))
      if (hdl.includes('s')) h = Math.max(minHVal, Math.min(WIDGET_MAX_H, h + dy))
      if (hdl.includes('n')) h = Math.max(minHVal, Math.min(WIDGET_MAX_H, h - dy))
      if (hdl.includes('e') || hdl.includes('w')) onResizeWidth(id, w)
      if (hdl.includes('n') || hdl.includes('s')) onResize(id, h)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [id, height, customWidthPx, minH, onResize, onResizeWidth])

  const cornerHandle = (handle, cursor) => (
    <div
      key={handle}
      role="presentation"
      className="absolute z-10 bg-transparent"
      style={{
        width: 14,
        height: 14,
        [handle.includes('e') ? 'right' : 'left']: -2,
        [handle.includes('s') ? 'bottom' : 'top']: -2,
        cursor
      }}
      onMouseDown={(e) => onResizeStart(e, handle)}
      title="Resize"
    />
  )

  const useCustomHeight = editMode && height != null
  const useCustomWidth = editMode && customWidthPx != null
  const style = {
    ...(useCustomHeight ? { height: height, minHeight: height } : {}),
    ...(useCustomWidth ? { width: customWidthPx, minWidth: customWidthPx, maxWidth: customWidthPx } : {})
  }
  const hasStyle = useCustomHeight || useCustomWidth
  const className = useCustomHeight
    ? 'shrink-0 flex flex-col min-h-0'
    : `shrink-0 flex flex-col ${sizeClassMap[sizeKey] || sizeClassMap.medium}`

  return (
    <div ref={boxRef} className={`relative bg-white/50 backdrop-blur-sm border border-ink/40 rounded-lg ${noPadding ? 'p-0' : 'p-2.5'} box-border ${className}`} style={hasStyle ? style : undefined}>
      {editMode && (
        <>
          {onDragHandleStart && (
            <div
              draggable
              onDragStart={onDragHandleStart}
              onDragEnd={onDragHandleEnd}
              className="absolute top-1.5 left-1.5 w-6 h-6 rounded bg-ink/20 hover:bg-ink/40 text-ink flex items-center justify-center cursor-grab active:cursor-grabbing z-[11]"
              aria-label="Drag to reorder"
              title="Drag to move widget"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z"/></svg>
            </div>
          )}
          {(onResize && onResizeWidth) && (
            <>
              {cornerHandle('nw', 'nwse-resize')}
              {cornerHandle('ne', 'nesw-resize')}
              {cornerHandle('sw', 'nesw-resize')}
              {cornerHandle('se', 'nwse-resize')}
            </>
          )}
          {onRemove && (
            <button type="button" onClick={() => onRemove(id)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-ink/20 hover:bg-ink/40 text-ink flex items-center justify-center text-xs font-bold z-10" aria-label="Remove widget">×</button>
          )}
        </>
      )}
      <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col ${contentClassMap ? (contentClassMap[sizeKey] || '') : ''}`}>
        {children}
      </div>
    </div>
  )
}

const DashboardPage = ({ searchQuery, profile, onOpenMap, onOpenSocial, widgetPreferences, setWidgetPreferences }) => {
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [galleryDragId, setGalleryDragId] = useState(null)
  const [saveFeedback, setSaveFeedback] = useState(false)
  const undoSnapshotRef = useRef(null)
  const visible = widgetPreferences?.visible ?? getDefaultWidgetPreferences().visible
  const size = widgetPreferences?.size ?? getDefaultWidgetPreferences().size
  const customHeight = widgetPreferences?.customHeight ?? {}
  const customWidth = widgetPreferences?.customWidth ?? {}
  const lockToGrid = widgetPreferences?.lockToGrid !== false

  const layout = widgetPreferences?.layout ?? getDefaultWidgetPreferences().layout
  const [dropTarget, setDropTarget] = useState(null)
  const dropTargetRef = useRef(null)
  const [draggedWidgetId, setDraggedWidgetId] = useState(null)

  const setLayout = (newLayout) => {
    setWidgetPreferences(prev => {
      const next = { ...prev, layout: newLayout }
      saveWidgetPreferences(next)
      return next
    })
  }

  const findInLayout = (lay, id) => {
    for (let r = 0; r < lay.length; r++)
      for (let c = 0; c < lay[r].length; c++)
        if (lay[r][c] === id) return [r, c]
    return [-1, -1]
  }
  const removeWidgetFromLayout = (lay, id) => {
    const out = lay.map(row => row.filter(w => w !== id))
    return out.filter(row => row.length > 0)
  }
  const insertAt = (lay, rowIndex, colIndex, placement, id) => {
    let layout = removeWidgetFromLayout(lay, id)
    const [srcRow, srcCol] = findInLayout(lay, id)
    let targetRow = rowIndex
    const removedEntireRow = srcRow >= 0 && lay[srcRow].length === 1
    if (removedEntireRow && srcRow < rowIndex) targetRow = rowIndex - 1
    if (removedEntireRow && srcRow === rowIndex) {
      targetRow = placement === 'below' ? rowIndex + 1 : rowIndex
    }
    let targetCol = colIndex
    if (removedEntireRow && srcRow === rowIndex && (placement === 'left' || placement === 'right')) {
      targetCol = placement === 'left' ? 0 : 1
    } else if (srcRow === rowIndex && (placement === 'left' || placement === 'right')) {
      if (srcCol < colIndex || (placement === 'right' && srcCol === colIndex)) targetCol = placement === 'left' ? colIndex - 1 : colIndex
    }
    if (placement === 'above') {
      layout = [...layout.slice(0, targetRow), [id], ...layout.slice(targetRow)]
    } else if (placement === 'below') {
      layout = [...layout.slice(0, targetRow + 1), [id], ...layout.slice(targetRow + 1)]
    } else if (placement === 'left') {
      const row = [...(layout[targetRow] || [])]
      row.splice(targetCol, 0, id)
      layout = [...layout.slice(0, targetRow), row, ...layout.slice(targetRow + 1)]
    } else {
      const row = [...(layout[targetRow] || [])]
      row.splice(targetCol + 1, 0, id)
      layout = [...layout.slice(0, targetRow), row, ...layout.slice(targetRow + 1)]
    }
    return layout
  }

  useEffect(() => {
    if (customizeOpen) {
      undoSnapshotRef.current = {
        visible: { ...(widgetPreferences?.visible ?? getDefaultWidgetPreferences().visible) },
        size: { ...(widgetPreferences?.size ?? getDefaultWidgetPreferences().size) },
        customHeight: { ...(widgetPreferences?.customHeight ?? {}) },
        customWidth: { ...(widgetPreferences?.customWidth ?? {}) },
        lockToGrid: widgetPreferences?.lockToGrid !== false,
        layout: (widgetPreferences?.layout ?? getDefaultWidgetPreferences().layout).map(row => [...row])
      }
    }
  }, [customizeOpen])

  const handleUndo = () => {
    if (undoSnapshotRef.current) {
      const next = { ...widgetPreferences, ...undoSnapshotRef.current }
      saveWidgetPreferences(next)
      setWidgetPreferences(next)
    }
  }
  const handleLoadDefaults = () => {
    const next = getDefaultWidgetPreferences()
    saveWidgetPreferences(next)
    setWidgetPreferences(next)
  }
  const handleSaveLayout = () => {
    saveWidgetPreferences(widgetPreferences)
    setSaveFeedback(true)
    setTimeout(() => setSaveFeedback(false), 2000)
  }

  const setVisible = (id, value) => {
    setWidgetPreferences(prev => {
      const next = { ...prev, visible: { ...prev.visible, [id]: value } }
      saveWidgetPreferences(next)
      return next
    })
  }
  const setSize = (id, value) => {
    setWidgetPreferences(prev => {
      const next = { ...prev, size: { ...prev.size, [id]: value } }
      saveWidgetPreferences(next)
      return next
    })
  }
  const setCustomHeight = (id, value) => {
    const snapped = lockToGrid ? snapToGrid(value, WIDGET_GRID_STEP, WIDGET_MIN_H, WIDGET_MAX_H) : Math.max(WIDGET_MIN_H, Math.min(WIDGET_MAX_H, value))
    setWidgetPreferences(prev => {
      const next = { ...prev, customHeight: { ...prev.customHeight, [id]: snapped } }
      saveWidgetPreferences(next)
      return next
    })
  }
  const setLockToGrid = (value) => {
    setWidgetPreferences(prev => {
      const next = { ...prev, lockToGrid: value }
      saveWidgetPreferences(next)
      return next
    })
  }
  const setCustomWidth = (id, value) => {
    const snapped = lockToGrid ? snapToGrid(value, WIDGET_GRID_STEP, WIDGET_MIN_W, WIDGET_MAX_W) : Math.max(WIDGET_MIN_W, Math.min(WIDGET_MAX_W, value))
    setWidgetPreferences(prev => {
      const next = { ...prev, customWidth: { ...prev.customWidth, [id]: snapped } }
      saveWidgetPreferences(next)
      return next
    })
  }

  const onWidgetDrop = (e) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('application/x-widget-id')
    if (id) addWidgetToBottom(id)
    setGalleryDragId(null)
  }
  const addWidgetToBottom = (id) => {
    setVisible(id, true)
    setLayout([...removeWidgetFromLayout(layout, id), [id]])
  }
  const onWidgetDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }

  const onReorderDragStart = (id) => (e) => {
    e.dataTransfer.setData('application/x-widget-reorder-id', id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDraggedWidgetId(id)
  }
  const onReorderDragEnd = () => {
    setDraggedWidgetId(null)
    setDropTarget(null)
    dropTargetRef.current = null
  }
  const onReorderDragOver = (e, rowIndex, colIndex) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const wy = (e.clientY - rect.top) / rect.height
    const wx = (e.clientX - rect.left) / rect.width
    let placement
    if (wy < 0.25) placement = 'above'
    else if (wy > 0.75) placement = 'below'
    else if (wx < 0.5) placement = 'left'
    else placement = 'right'
    const target = { rowIndex, colIndex, placement }
    dropTargetRef.current = target
    setDropTarget(target)
  }
  const onReorderDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const draggedId = e.dataTransfer.getData('application/x-widget-reorder-id') || e.dataTransfer.getData('text/plain')
    if (!draggedId) return
    const target = dropTargetRef.current ?? dropTarget
    setDropTarget(null)
    dropTargetRef.current = null
    if (!target) return
    const { rowIndex, colIndex, placement } = target
    const newLayout = insertAt(layout, rowIndex, colIndex, placement, draggedId)
    setLayout(newLayout)
  }

  return (
    <div className="relative parchment-main p-3 md:p-4 h-full flex flex-col min-h-0 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0 max-w-[1400px] mx-auto w-full" style={{ gridTemplateRows: 'minmax(0, 1fr)' }}>
        <div className="md:col-span-1 flex flex-col min-h-0 h-full overflow-hidden">
          <div className="shrink-0 pr-1 pb-1.5 bg-transparent">
            <div className="bg-white/60 backdrop-blur-sm border border-ink/40 rounded-lg p-2 flex items-center gap-1.5">
              <input type="text" placeholder="Search" defaultValue={searchQuery} className="flex-1 bg-transparent border-0 outline-none text-ink placeholder-ink/60 text-xs min-w-0" />
              <svg className="w-4 h-4 text-ink/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="text-xs font-bold text-ink border-b border-ink/30 pb-1 pt-1.5">Latest Reports</h3>
          </div>
          <div className="overflow-y-auto scrollbar-hide flex-1 min-h-0 space-y-2 pr-1 mt-1">
            {ARTICLES.map(article => (
              <div key={article.id} onClick={() => window.open(article.url, '_blank')} className="bg-white/50 backdrop-blur-sm border border-ink/40 rounded-lg p-2.5 cursor-pointer hover:bg-white/70 transition-colors group shrink-0">
                <div className="aspect-video rounded-md mb-2 overflow-hidden border border-ink/20 bg-white/30">
                  <ArticleCardImage url={article.url} image={article.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[9px] font-semibold text-red-700 bg-red-50/80 px-1 py-0.5 rounded">{article.source}</span>
                  <span className="text-[9px] text-ink/60">{article.date}</span>
                </div>
                <h3 className="font-bold text-ink text-xs group-hover:underline leading-tight line-clamp-2">{article.title}</h3>
                <p className="text-[10px] text-ink/70 mt-0.5 leading-snug line-clamp-2">{article.summary}</p>
              </div>
            ))}
          </div>
        </div>
        <div
          className="md:col-span-2 flex flex-col gap-2 min-h-0 overflow-y-auto scrollbar-hide h-full overflow-x-hidden"
          onDragOver={customizeOpen ? (e) => {
            e.preventDefault()
            if (e.dataTransfer.types.indexOf('application/x-widget-reorder-id') !== -1) {
              e.dataTransfer.dropEffect = 'move'
              if (!e.target.closest('[data-widget-wrapper]')) {
                const target = { rowIndex: layout.length, colIndex: 0, placement: 'above' }
                dropTargetRef.current = target
                setDropTarget(target)
              }
            } else {
              e.dataTransfer.dropEffect = 'copy'
            }
          } : undefined}
          onDrop={customizeOpen ? (e) => {
            const reorderId = e.dataTransfer.getData('application/x-widget-reorder-id')
            if (reorderId) {
              onReorderDrop(e)
            } else {
              onWidgetDrop(e)
            }
          } : undefined}
          onDragLeave={customizeOpen ? () => { setDropTarget(null); dropTargetRef.current = null } : undefined}
          style={customizeOpen ? { outline: '2px dashed rgba(44,40,37,0.2)', outlineOffset: -2 } : undefined}
        >
          {layout.map((row, rowIndex) => (
            <Fragment key={rowIndex}>
              {customizeOpen && dropTarget?.placement === 'above' && dropTarget?.rowIndex === rowIndex && (
                <div className="h-1 flex-shrink-0 rounded bg-ink/60 my-0.5 min-h-[4px] border-t-2 border-ink/70" aria-hidden />
              )}
              <div className="flex flex-wrap gap-2 shrink-0 min-h-0">
                {row.map((id, colIndex) => {
                  if (visible[id] === false) return null
                  const wrapperStyle = customWidth[id] != null ? { width: customWidth[id], flex: '0 0 auto' } : { flex: '1 1 0', minWidth: 200 }
                  return (
                    <Fragment key={id}>
                      {customizeOpen && dropTarget?.rowIndex === rowIndex && dropTarget?.colIndex === colIndex && dropTarget?.placement === 'left' && (
                        <div className="w-1 flex-shrink-0 rounded bg-ink/60 min-h-[24px] border-l-2 border-ink/70 self-stretch" aria-hidden />
                      )}
                      <div
                        data-widget-wrapper
                        className="shrink-0 min-w-0"
                        style={wrapperStyle}
                        onDragOver={customizeOpen ? (e) => onReorderDragOver(e, rowIndex, colIndex) : undefined}
                        onDrop={customizeOpen ? onReorderDrop : undefined}
                      >
                        <ResizableWidgetBox
                          id={id}
                          editMode={customizeOpen}
                          height={customHeight[id]}
                          width={customWidth[id]}
                          minH={id === 'archbot' ? 120 : id === 'global-events' || id === 'social-activity' ? 100 : undefined}
                          onResize={setCustomHeight}
                          onResizeWidth={customizeOpen ? setCustomWidth : undefined}
                          onRemove={customizeOpen ? (widgetId) => setVisible(widgetId, false) : undefined}
                          onDragHandleStart={customizeOpen ? onReorderDragStart(id) : undefined}
                          onDragHandleEnd={customizeOpen ? onReorderDragEnd : undefined}
                          sizeKey={size[id]}
                          sizeClassMap={id === 'archbot' ? SIZE_CLASS_ARCHBOT : id === 'global-events' ? SIZE_CLASS_CONTENT : SIZE_CLASS}
                          contentClassMap={null}
                          noPadding={id === 'archbot'}
                        >
                          {id === 'minimap' && <MiniMapWidget profile={profile} onOpenMap={onOpenMap} />}
                          {id === 'quickstats' && <QuickStatsWidget profile={profile} onOpenMap={onOpenMap} />}
                          {id === 'archbot' && (
                            <div className="flex-1 min-h-0 flex flex-col min-w-0">
                              <ArchBotChatBox profile={profile} />
                            </div>
                          )}
                          {id === 'global-events' && (
                            <div className="h-full">
                              <h3 className="text-xs font-bold text-ink border-b border-ink/30 pb-1.5 mb-2">Global Events</h3>
                              <div className="space-y-2">
                                {EVENTS.map(e => (
                                  <div key={e.title} className="flex gap-2 items-center border-b border-ink/20 pb-2 last:border-0 last:pb-0">
                                    <div className="bg-ink text-white p-1.5 text-center min-w-[40px] rounded shrink-0">
                                      <div className="text-[9px] font-bold leading-tight">{e.month}</div>
                                      <div className="text-sm font-bold leading-tight">{e.day}</div>
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-semibold text-ink text-[11px] leading-tight">{e.title}</h4>
                                      <p className="text-[9px] text-ink/60 mt-0.5">Location: {e.loc}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {id === 'social-activity' && (
                            <SocialActivityWidget profile={profile} onOpenSocial={onOpenSocial} />
                          )}
                        </ResizableWidgetBox>
                      </div>
                      {customizeOpen && dropTarget?.rowIndex === rowIndex && dropTarget?.colIndex === colIndex && dropTarget?.placement === 'right' && (
                        <div className="w-1 flex-shrink-0 rounded bg-ink/60 min-h-[24px] border-r-2 border-ink/70 self-stretch" aria-hidden />
                      )}
                    </Fragment>
                  )
                })}
              </div>
              {customizeOpen && dropTarget?.placement === 'below' && dropTarget?.rowIndex === rowIndex && (
                <div className="h-1 flex-shrink-0 rounded bg-ink/60 my-0.5 min-h-[4px] border-t-2 border-ink/70" aria-hidden />
              )}
            </Fragment>
          ))}
          {customizeOpen && dropTarget?.rowIndex === layout.length && dropTarget?.placement === 'above' && (
            <div className="h-1 flex-shrink-0 rounded bg-ink/60 my-0.5 min-h-[4px] border-t-2 border-ink/70" aria-hidden />
          )}
          <div className="shrink-0 flex items-center justify-end gap-1 pr-1 pt-1">
            <button
              type="button"
              onClick={() => setCustomizeOpen(o => !o)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${customizeOpen ? 'border-ink bg-ink text-white hover:bg-ink/90' : 'border-ink/30 bg-white/60 backdrop-blur-sm text-ink hover:bg-white/80'}`}
              title="Add/remove widgets and change size"
            >
              <NavIcon name="cog" className="w-4 h-4" />
              {customizeOpen ? 'Done editing' : 'Customize widgets'}
            </button>
          </div>
        </div>
      </div>

      {/* Vista-style bottom tab: Widget gallery (drag-and-drop to add) */}
      {customizeOpen && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-ink/30 shadow-[0_-4px_20px_rgba(44,40,37,0.08)] rounded-t-2xl flex flex-col max-h-[280px]">
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-ink/20 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-ink">Add widgets</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="text-xs font-medium text-ink/70 hover:text-ink px-2 py-1 rounded-lg hover:bg-ink/10"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleUndo}
                className="text-xs font-medium text-ink/70 hover:text-ink px-2 py-1 rounded-lg hover:bg-ink/10"
                title="Revert widget layout to when you opened this panel"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleLoadDefaults}
                className="text-xs font-medium text-ink/70 hover:text-ink px-2 py-1 rounded-lg hover:bg-ink/10"
                title="Reset to default widgets, layout, and sizes"
              >
                Default layout
              </button>
              <button
                type="button"
                onClick={handleSaveLayout}
                className="text-xs font-medium text-ink/70 hover:text-ink px-2 py-1 rounded-lg hover:bg-ink/10 min-w-[4rem]"
                title="Save current widget layout"
              >
                {saveFeedback ? 'Saved!' : 'Save'}
              </button>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={lockToGrid}
                  onChange={(e) => setLockToGrid(e.target.checked)}
                  className="rounded border-ink/40 text-ink"
                />
                <span className="text-xs font-medium text-ink">Lock to grid ({WIDGET_GRID_STEP}px)</span>
              </label>
              <span className="text-[10px] text-ink/60 hidden sm:inline">Drag a widget onto the dashboard above</span>
            </div>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide p-4">
            <div className="flex flex-wrap gap-3">
              {WIDGET_IDS.map(id => (
                <button
                  key={id}
                  type="button"
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('application/x-widget-id', id); e.dataTransfer.effectAllowed = 'copy'; setGalleryDragId(id) }}
                  onDragEnd={() => setGalleryDragId(null)}
                  onClick={() => addWidgetToBottom(id)}
                  className={`flex flex-col items-center justify-center w-24 h-20 rounded-xl border-2 bg-white/80 cursor-grab active:cursor-grabbing border-ink/30 hover:border-ink/50 hover:shadow-md transition-all shrink-0 ${galleryDragId === id ? 'opacity-70 scale-95' : ''}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-ink/10 flex items-center justify-center text-ink/80">
                    <NavIcon name={WIDGET_ICONS[id]} className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium text-ink mt-1.5 text-center leading-tight px-0.5">{WIDGET_LABELS[id]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [widgetPreferences, setWidgetPreferences] = useState(() => loadWidgetPreferences())
  const mobileMainRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const isToolRoute = location.pathname === '/illustrator-2d' || location.pathname === '/viewer-3d'

  // Auto-hide sidebar when entering a tool route
  useEffect(() => {
    if (isToolRoute) setSidebarCollapsed(true)
  }, [isToolRoute])

  useEffect(() => {
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
    setWidgetPreferences(loadWidgetPreferences())
  }, [])

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        try {
          supabase.realtime?.setAuth?.(session?.access_token || '')
        } catch (_) {}
        if (session) fetchProfile(session.user.id)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        try {
          supabase.realtime?.setAuth?.(session?.access_token || '')
        } catch (_) {}
        if (session) fetchProfile(session.user.id)
        else setProfile(null)
      })
      return () => subscription?.unsubscribe()
    } else {
      setSession(null)
      setProfile(null)
    }
  }, [])

  async function fetchProfile(userId) {
    if (!supabase) return
    const response = await supabase.from('profiles').select('*').eq('id', userId)
    if (response.error) {
      console.error('Profile fetch error', response.error)
    } else if (response.data && response.data.length > 0) {
      setProfile(response.data[0])
    }
  }

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  if (!session) return <Auth />

  const isArcheologist = isArcheologistRole(profile)
  const isStudent = profile?.role === 'Student'
  const pcNavItems = [
    { viewKey: 'home', label: 'Home', icon: 'home' },
    ...(isArcheologist ? [{ viewKey: 'arch', label: 'Arch Zone', icon: 'grid' }] : []),
    { viewKey: 'map', label: 'Map', icon: 'map' },
    ...(isStudent ? [{ viewKey: 'education', label: 'Edu Lab', icon: 'document' }] : []),
    { viewKey: 'team', label: 'Team', icon: 'people' },
    { viewKey: 'social', label: 'Social', icon: 'social' },
  ]

  return (
    <div className="min-h-screen bg-[#f8f3e8] text-ink font-sans">
      {/* PC: sidebar + parchment main (768px+) */}
      <div className="hidden md:flex md:h-screen md:flex-col parchment-main overflow-hidden">
        <div className="flex flex-1 min-h-0 min-w-0 relative h-full overflow-hidden">
          {/* On tool route: overlay sidebar with left-edge hover zone (auto-show on hover, auto-hide on leave) */}
          {isToolRoute ? (
            <div
              className="fixed left-0 top-0 bottom-0 z-50 flex transition-[width] duration-300 ease-out"
              style={{ width: sidebarCollapsed ? 12 : 72 }}
              onMouseEnter={() => setSidebarCollapsed(false)}
              onMouseLeave={() => setSidebarCollapsed(true)}
            >
              <aside
                className="h-full w-[72px] shrink-0 flex flex-col rounded-[2rem] overflow-hidden transition-transform duration-300 ease-out bg-white/80 backdrop-blur-xl border-r border-t border-b border-ink/20"
                style={{ transform: sidebarCollapsed ? 'translateX(calc(-100% + 12px))' : 'translateX(0)' }}
              >
                <div className="p-1.5 border-b border-ink/10 shrink-0 flex flex-col items-center">
                  <button type="button" onClick={() => { navigate('/'); setView('account'); }} className="w-8 h-8 rounded-full border border-ink/20 flex items-center justify-center mb-1 overflow-hidden bg-parchment-300 focus:outline-none focus:ring-2 focus:ring-ink/30">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <svg className="w-4 h-4 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
</button>
                <p className="text-[9px] font-medium text-ink text-center truncate w-full leading-tight" title={profile?.full_name || profile?.email}>{profile?.full_name?.split(' ')[0] || profile?.username || 'User'}</p>
                </div>
                <nav className="flex-1 min-h-0 overflow-hidden py-1 flex flex-col items-center gap-0.5">
                  {pcNavItems.map(({ viewKey, label, icon }) => (
                    <button key={label} onClick={() => { navigate('/'); setView(viewKey); }} className="group w-full flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg min-w-0 text-ink hover:bg-parchment-100">
                      <NavIcon name={icon} className="w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                      <span className="text-[9px] font-medium leading-tight text-center line-clamp-2">{label}</span>
                    </button>
                  ))}
                </nav>
              </aside>
            </div>
          ) : (
            /* Normal hub: always-visible sidebar */
            <aside className="w-[72px] shrink-0 h-screen flex flex-col rounded-[2rem] overflow-hidden sticky top-0 bg-white/80 backdrop-blur-xl border-r border-t border-b border-ink/20">
              <div className="p-1.5 border-b border-ink/10 shrink-0 flex flex-col items-center">
                <button type="button" onClick={() => { navigate('/'); setView('account'); }} className="w-8 h-8 rounded-full border border-ink/20 flex items-center justify-center mb-1 overflow-hidden bg-parchment-300 focus:outline-none focus:ring-2 focus:ring-ink/30">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <svg className="w-4 h-4 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                </button>
                <p className="text-[9px] font-medium text-ink text-center truncate w-full leading-tight" title={profile?.full_name || profile?.email}>{profile?.full_name?.split(' ')[0] || profile?.username || 'User'}</p>
              </div>
              <nav className="flex-1 min-h-0 overflow-hidden py-1 flex flex-col items-center gap-0.5">
                {pcNavItems.map(({ viewKey, label, icon }) => (
                  <button key={label} onClick={() => { navigate('/'); setView(viewKey); }} className={`group w-full flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg min-w-0 ${view === viewKey ? 'bg-parchment-300/80 text-ink' : 'text-ink hover:bg-parchment-100'}`}>
                    <NavIcon name={icon} className={`w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${view === viewKey ? 'text-yellow-400' : ''}`} />
                    <span className="text-[9px] font-medium leading-tight text-center line-clamp-2">{label}</span>
                  </button>
                ))}
              </nav>
            </aside>
          )}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 bg-transparent overflow-hidden ${isToolRoute ? 'pl-0' : 'pl-4'} h-full`}>
            <main className={`flex-1 min-h-0 bg-transparent ${!isToolRoute && view === 'home' ? 'overflow-hidden flex flex-col h-full' : 'overflow-auto'}`}>
          {location.pathname === '/illustrator-2d' && (
            <div className="relative w-full h-full">
              <div className="md:hidden fixed top-0 left-0 right-0 z-[100] flex items-center gap-2 px-4 py-3 bg-black/90 text-white border-b border-white/20">
                <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-white/90">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to Hub
                </Link>
              </div>
              <div className={location.pathname === '/illustrator-2d' ? 'pt-14 md:pt-0' : ''}>
                <Illustrator2DPage />
              </div>
            </div>
          )}
          {location.pathname === '/viewer-3d' && (
            <div className="relative w-full h-full">
              <div className="md:hidden fixed top-0 left-0 right-0 z-[100] flex items-center gap-2 px-4 py-3 bg-black/90 text-white border-b border-white/20">
                <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-white/90">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to Hub
                </Link>
              </div>
              <div className="pt-14 md:pt-0 h-full">
                <Viewer3DPage />
              </div>
            </div>
          )}
              {!isToolRoute && view === 'home' && (
                <div className="h-full min-h-0 overflow-hidden flex flex-col">
                  <DashboardPage searchQuery={searchQuery} profile={profile} onOpenMap={() => setView('map')} onOpenSocial={(chatroomId) => { try { if (chatroomId) localStorage.setItem('global-arch-social-selected-chatroom', chatroomId); } catch (_) {} setView('social'); }} widgetPreferences={widgetPreferences} setWidgetPreferences={setWidgetPreferences} />
                </div>
              )}
              {!isToolRoute && view === 'map' && <div className="relative parchment-main min-h-full"><div className="p-6"><SitesMap searchQuery={searchQuery} profile={profile} /></div></div>}
              {!isToolRoute && view === 'education' && isStudent && <div className="relative parchment-main min-h-full"><div className="p-6"><EducationZone profile={profile} onNavigateToMap={() => setView('map')} /></div></div>}
              {!isToolRoute && view === 'arch' && isArcheologist && <div className="relative parchment-main min-h-full"><div className="p-6"><ArchZone profile={profile} onNavigateToMap={() => setView('map')} isDesktop onOpenArchives={() => setView('archives')} /></div></div>}
              {!isToolRoute && view === 'archives' && <div className="relative parchment-main min-h-full"><ArchivesPage profile={profile} onBack={() => setView('arch')} /></div>}
              {!isToolRoute && view === 'journal' && activeSiteId && <div className="relative parchment-main min-h-full"><div className="p-6"><JournalTerminal siteId={activeSiteId} profile={profile} onBack={() => setView('map')} /></div></div>}
              {!isToolRoute && view === 'account' && <AccountPage profile={profile} session={session} onProfileUpdate={(updated) => setProfile(prev => prev ? { ...prev, ...updated } : null)} onLogout={handleLogout} onRestoreDefaultLayout={() => { const def = getDefaultWidgetPreferences(); setWidgetPreferences(def); saveWidgetPreferences(def); setView('home'); }} isMobile={false} />}
              {!isToolRoute && view === 'team' && <TeamPage profile={profile} onBack={() => setView('home')} />}
              {!isToolRoute && view === 'social' && <SocialPage profile={profile} />}
              {!isToolRoute && view === 'objects' && <div className="relative parchment-main min-h-full p-8 flex items-center justify-center text-ink/60"><p className="text-sm">Coming soon</p></div>}
            </main>
          </div>
        </div>
      </div>

      {/* Mobile: header (search locked at top) + main + curved bottom nav (< 768px). Full-screen background. */}
      <div className="md:hidden flex flex-col min-h-screen h-screen overflow-hidden bg-[#f8f3e8]" style={{ minHeight: '100dvh' }}>
        <header
          className="fixed top-0 left-0 right-0 z-[1000] overflow-hidden border-b border-ink/10 shrink-0"
          style={{
            background: '#f8f3e8',
            transform: isToolRoute ? 'translate3d(0, -100%, 0)' : 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          {/* Opaque cap over status bar so no content can ever paint there */}
          <div style={{ height: 'env(safe-area-inset-top)', minHeight: 0, background: '#f8f3e8' }} aria-hidden />
          <div className="px-3 pb-2 pt-0.5 flex items-center gap-3" style={{ paddingTop: '0.75rem' }}>
            {['archives', 'journal', 'team', 'education', 'social'].includes(view) && (
              <button
                type="button"
                onClick={() => {
                  if (view === 'archives') setView('arch');
                  else if (view === 'journal') setView('map');
                  else if (view === 'team' || view === 'education') setView('home');
                  else if (view === 'social') setView('home');
                }}
                className="flex items-center gap-1.5 min-h-[44px] min-w-[44px] -ml-1 text-ink font-medium"
                aria-label="Back"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span className="text-sm">Back</span>
              </button>
            )}
            <h1 className="text-base font-bold text-ink leading-tight flex-1 text-center">Archaeology Hub</h1>
            {['archives', 'journal', 'team', 'education', 'social'].includes(view) && <div className="w-[68px]" />}
          </div>
        </header>
        <main
          ref={mobileMainRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          style={{
            paddingTop: isToolRoute ? 0 : '5.25rem',
            paddingBottom: 'max(5rem, env(safe-area-inset-bottom))'
          }}
        >
          {location.pathname === '/viewer-3d' && (
            <div className="relative w-full h-full">
              <div className="fixed top-0 left-0 right-0 z-[100] flex items-center gap-2 px-4 py-3 bg-black/90 text-white border-b border-white/20" >
                <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-white/90">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to Hub
                </Link>
              </div>
              <div className="pt-14">
                <Viewer3DPage />
              </div>
            </div>
          )}
          {location.pathname === '/illustrator-2d' && (
            <div className="relative w-full h-full">
              <div className="fixed top-0 left-0 right-0 z-[100] flex items-center gap-2 px-4 py-3 bg-black/90 text-white border-b border-white/20" >
                <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-white/90">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to Hub
                </Link>
              </div>
              <div className="pt-14">
                <Illustrator2DPage />
              </div>
            </div>
          )}
          {!isToolRoute && view === 'home' && <MobileDashboard profile={profile} onOpenMap={() => setView('map')} onOpenSocial={(chatroomId) => openSocialFromMobile(setView, chatroomId)} />}
          {!isToolRoute && view === 'map' && <div className="p-4 min-h-[60vh]"><SitesMap searchQuery={searchQuery} profile={profile} /></div>}
          {!isToolRoute && view === 'education' && isStudent && <div className="p-4"><EducationZone profile={profile} onNavigateToMap={() => setView('map')} /></div>}
          {!isToolRoute && view === 'arch' && isArcheologist && <div className="p-4"><ArchZone profile={profile} onNavigateToMap={() => setView('map')} isDesktop={false} onOpenArchives={() => setView('archives')} onOpenSocial={() => setView('social')} /></div>}
          {!isToolRoute && view === 'archives' && <div className="p-4 min-h-[60vh]"><ArchivesPage profile={profile} onBack={() => setView('arch')} /></div>}
          {!isToolRoute && view === 'journal' && activeSiteId && <div className="p-4"><JournalTerminal siteId={activeSiteId} profile={profile} onBack={() => setView('map')} /></div>}
          {!isToolRoute && view === 'account' && <AccountPage profile={profile} session={session} onProfileUpdate={(updated) => setProfile(prev => prev ? { ...prev, ...updated } : null)} onLogout={handleLogout} onRestoreDefaultLayout={() => { const def = getDefaultWidgetPreferences(); setWidgetPreferences(def); saveWidgetPreferences(def); setView('home'); }} isMobile />}
          {!isToolRoute && view === 'team' && <div className="p-4 min-h-[60vh]"><TeamPage profile={profile} onBack={() => setView('home')} /></div>}
          {!isToolRoute && view === 'social' && <SocialPage profile={profile} />}
        </main>
        <nav
          className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-white/90 backdrop-blur-sm border-t border-ink/10 rounded-t-3xl shadow-[0_-4px_20px_rgba(44,40,37,0.06)] transition-transform duration-300 ease-out ${
            isToolRoute ? 'translate-y-full' : 'translate-y-0'
          }`}
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))', paddingTop: '0.75rem' }}
        >
          <button type="button" onClick={() => setView('home')} className="flex flex-col items-center gap-0.5 p-2 min-h-[44px] text-ink/50" aria-label="Home">
            <NavIcon name="home" className={`w-6 h-6 ${view === 'home' ? 'text-ink' : 'text-ink/50'}`} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button type="button" onClick={() => setView('map')} className="flex flex-col items-center gap-0.5 p-2 min-h-[44px] text-ink/50" aria-label="Map">
            <NavIcon name="map" className={`w-6 h-6 ${view === 'map' ? 'text-ink' : 'text-ink/50'}`} />
            <span className="text-[10px] font-medium">Map</span>
          </button>
          <button type="button" onClick={() => setView('arch')} className="flex flex-col items-center gap-0.5 p-2 min-h-[44px] text-ink/50" aria-label="Arch Zone">
            <NavIcon name="grid" className={`w-6 h-6 ${view === 'arch' ? 'text-ink' : 'text-ink/50'}`} />
            <span className="text-[10px] font-medium">Arch Zone</span>
          </button>
          <button type="button" onClick={() => setView('account')} className={`flex flex-col items-center gap-0.5 p-2 min-h-[44px] ${view === 'account' ? 'text-ink' : 'text-ink/50'}`} aria-label="Account">
            <NavIcon name="user" className={`w-6 h-6 ${view === 'account' ? 'text-ink' : 'text-ink/50'}`} />
            <span className="text-[10px] font-medium">Account</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

export default App
