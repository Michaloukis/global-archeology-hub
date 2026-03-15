import { useState, useMemo, useCallback, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EVENT_TYPES = [
  { id: 'meeting', label: 'Meeting', color: 'bg-blue-500' },
  { id: 'fieldwork', label: 'Fieldwork', color: 'bg-amber-600' },
  { id: 'seminar', label: 'Seminar', color: 'bg-violet-500' },
  { id: 'deadline', label: 'Deadline', color: 'bg-red-500' },
  { id: 'other', label: 'Other', color: 'bg-ink/50' }
]

const STORAGE_KEY = 'global-archeology-calendar-events'

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const daysInMonth = last.getDate()
  const weeks = []
  let week = []
  for (let i = 0; i < startDow; i++) week.push({ day: null, date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    week.push({ day: d, date: new Date(year, month, d) })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) {
    while (week.length < 7) week.push({ day: null, date: null })
    weeks.push(week)
  }
  return weeks
}

function toDateKey(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function globalEventToKey(e, year) {
  const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const m = MON.indexOf(String(e.month).toUpperCase())
  if (m < 0) return null
  const d = parseInt(e.day, 10)
  if (Number.isNaN(d) || d < 1 || d > 31) return null
  return `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function loadUserEventsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return []
  }
}

function saveUserEventsToStorage(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch (_) {}
}

function dbRowToEvent(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    loc: row.location ?? undefined,
    description: row.description ?? undefined,
    time: row.time ?? undefined,
    eventType: row.event_type ?? 'other'
  }
}

/** Build "Add to Google Calendar" URL for an event. date = YYYY-MM-DD, time = optional HH:MM or HH:MM:SS */
function getGoogleCalendarEventUrl({ title, date, time, loc, description }) {
  const base = 'https://calendar.google.com/calendar/render'
  const params = new URLSearchParams()
  params.set('action', 'TEMPLATE')
  params.set('text', title || 'Event')
  const [y, m, d] = (date || '').split('-').map(Number)
  if (!y || !m || !d) return base + '?' + params.toString()
  const pad = (n) => String(n).padStart(2, '0')
  let startStr, endStr
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [hh, mm] = time.trim().split(':').map((s) => parseInt(s, 10) || 0)
    startStr = `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`
    const endHour = hh + (mm >= 30 ? 2 : 1)
    const endH = endHour % 24
    const endD = d + (endHour >= 24 ? 1 : 0)
    endStr = `${y}${pad(m)}${pad(endD)}T${pad(endH)}${pad(mm)}00`
  } else {
    startStr = `${y}${pad(m)}${pad(d)}T000000`
    endStr = `${y}${pad(m)}${pad(d)}T235959`
  }
  params.set('dates', `${startStr}/${endStr}`)
  if (loc) params.set('location', loc)
  if (description) params.set('details', description)
  return base + '?' + params.toString()
}

export default function CalendarPage({ onBack, globalEvents = [], profile }) {
  const [cursor, setCursor] = useState(() => new Date())
  const [userEvents, setUserEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month' | 'agenda'
  const [filter, setFilter] = useState('all') // 'all' | 'mine' | 'global'
  const [newEvent, setNewEvent] = useState({ title: '', loc: '', description: '', time: '', type: 'other' })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const grid = useMemo(() => getMonthGrid(year, month), [year, month])

  const globalByKey = useMemo(() => {
    const map = new Map()
    globalEvents.forEach(e => {
      const k = globalEventToKey(e, year)
      if (k) {
        if (!map.has(k)) map.set(k, [])
        map.get(k).push({ title: e.title, loc: e.loc, type: 'global' })
      }
    })
    return map
  }, [globalEvents, year])

  const userByKey = useMemo(() => {
    const map = new Map()
    userEvents.forEach(e => {
      const k = e.date
      if (!map.has(k)) map.set(k, [])
      map.get(k).push({ title: e.title, loc: e.loc, id: e.id, type: 'user', eventType: e.eventType, time: e.time, description: e.description })
    })
    return map
  }, [userEvents])

  useEffect(() => {
    let cancelled = false
    setEventsError(null)
    if (profile?.id && supabase) {
      setEventsLoading(true)
      supabase
        .from('calendar_events')
        .select('id, title, date, location, description, time, event_type')
        .eq('user_id', profile.id)
        .order('date', { ascending: true })
        .then(async ({ data, error }) => {
          if (cancelled) return
          if (error) {
            setEventsLoading(false)
            setEventsError(error.message)
            setUserEvents(loadUserEventsFromStorage())
            return
          }
          const fromDb = (data || []).map(dbRowToEvent)
          if (fromDb.length === 0) {
            const fromStorage = loadUserEventsFromStorage()
            if (fromStorage.length > 0) {
              const { data: inserted, error: insertErr } = await supabase
                .from('calendar_events')
                .insert(fromStorage.map(e => ({
                  user_id: profile.id,
                  title: e.title,
                  date: e.date,
                  location: e.loc ?? null,
                  description: e.description ?? null,
                  time: e.time ?? null,
                  event_type: e.eventType ?? 'other'
                })))
                .select('id, title, date, location, description, time, event_type')
              if (!cancelled && !insertErr && inserted?.length) {
                setUserEvents(inserted.map(dbRowToEvent))
                saveUserEventsToStorage([])
              } else if (!cancelled) {
                setUserEvents(fromStorage)
              }
            } else {
              setUserEvents(fromDb)
            }
          } else {
            setUserEvents(fromDb)
          }
          setEventsLoading(false)
        })
    } else {
      setEventsLoading(false)
      setUserEvents(loadUserEventsFromStorage())
    }
    return () => { cancelled = true }
  }, [profile?.id])

  const goPrev = useCallback(() => {
    setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1))
  }, [])
  const goNext = useCallback(() => {
    setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1))
  }, [])
  const goToday = useCallback(() => {
    setCursor(new Date())
    setSelectedDate(null)
  }, [])

  const openAddEventFromFab = useCallback(() => {
    const today = new Date()
    setSelectedDate(today)
    setShowAddForm(true)
    setEditingEventId(null)
    setNewEvent({ title: '', loc: '', description: '', time: '', type: 'other' })
    setTimeout(() => document.getElementById('calendar-date-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150)
  }, [])

  const eventsForDate = useCallback((dateKey, filterType = filter) => {
    const global = filterType === 'mine' ? [] : (globalByKey.get(dateKey) || [])
    const user = filterType === 'global' ? [] : (userByKey.get(dateKey) || [])
    return [...global, ...user]
  }, [globalByKey, userByKey, filter])

  const handleSaveEvent = useCallback(async () => {
    if (!selectedDate || !newEvent.title.trim()) return
    const dateKey = toDateKey(selectedDate)
    const payload = {
      title: newEvent.title.trim(),
      date: dateKey,
      loc: newEvent.loc.trim() || undefined,
      description: newEvent.description.trim() || undefined,
      time: newEvent.time.trim() || undefined,
      eventType: newEvent.type
    }
    if (profile?.id && supabase) {
      try {
        if (editingEventId) {
          const { error } = await supabase
            .from('calendar_events')
            .update({
              title: payload.title,
              date: payload.date,
              location: payload.loc ?? null,
              description: payload.description ?? null,
              time: payload.time ?? null,
              event_type: payload.eventType,
              updated_at: new Date().toISOString()
            })
            .eq('id', editingEventId)
            .eq('user_id', profile.id)
          if (error) throw error
          setUserEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, ...payload } : e))
        } else {
          const { data, error } = await supabase
            .from('calendar_events')
            .insert({
              user_id: profile.id,
              title: payload.title,
              date: payload.date,
              location: payload.loc ?? null,
              description: payload.description ?? null,
              time: payload.time ?? null,
              event_type: payload.eventType
            })
            .select('id, title, date, location, description, time, event_type')
            .single()
          if (error) throw error
          setUserEvents(prev => [...prev, dbRowToEvent(data)])
        }
        setNewEvent({ title: '', loc: '', description: '', time: '', type: 'other' })
        setShowAddForm(false)
        setEditingEventId(null)
        setSelectedDate(null)
      } catch (err) {
        setEventsError(err?.message ?? 'Failed to save event')
      }
      return
    }
    const id = editingEventId || `user-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const next = editingEventId
      ? userEvents.map(e => e.id === editingEventId ? { ...e, ...payload } : e)
      : [...userEvents, { id, ...payload }]
    setUserEvents(next)
    saveUserEventsToStorage(next)
    setNewEvent({ title: '', loc: '', description: '', time: '', type: 'other' })
    setShowAddForm(false)
    setEditingEventId(null)
    setSelectedDate(null)
  }, [selectedDate, newEvent, userEvents, editingEventId, profile?.id])

  const startEditingEvent = useCallback((ev, eventDate) => {
    setSelectedDate(eventDate)
    setNewEvent({
      title: ev.title,
      loc: ev.loc || '',
      description: ev.description || '',
      time: ev.time || '',
      type: ev.eventType || 'other'
    })
    setEditingEventId(ev.id)
    setShowAddForm(true)
  }, [])

  const handleDeleteUserEvent = useCallback(async (id) => {
    if (profile?.id && supabase) {
      try {
        const { error } = await supabase
          .from('calendar_events')
          .delete()
          .eq('id', id)
          .eq('user_id', profile.id)
        if (error) throw error
        setUserEvents(prev => prev.filter(e => e.id !== id))
      } catch (err) {
        setEventsError(err?.message ?? 'Failed to delete event')
      }
      return
    }
    const next = userEvents.filter(e => e.id !== id)
    setUserEvents(next)
    saveUserEventsToStorage(next)
  }, [userEvents, profile?.id])

  const todayKey = toDateKey(new Date())

  const agendaItems = useMemo(() => {
    const items = []
    const last = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= last; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const events = eventsForDate(key)
      if (events.length > 0) items.push({ date: new Date(year, month, d), dateKey: key, events })
    }
    return items
  }, [year, month, eventsForDate])

  const handleExportMonth = useCallback(() => {
    const rows = [['Date', 'Title', 'Location', 'Type', 'Time']]
    const last = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= last; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const events = eventsForDate(key, 'all')
      events.forEach(ev => {
        rows.push([
          key,
          ev.title,
          ev.loc || '',
          ev.type === 'global' ? 'Global' : (ev.eventType || 'Other'),
          ev.time || ''
        ])
      })
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calendar-${year}-${String(month + 1).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [year, month, eventsForDate])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext])

  const totalEventsThisMonth = useMemo(() => {
    let n = 0
    const last = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= last; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      n += eventsForDate(key, 'all').length
    }
    return n
  }, [year, month, eventsForDate])

  return (
    <div className="min-h-full bg-[#faf8f5]">
      {eventsError && (
        <div className="sticky top-0 z-20 bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center justify-between gap-2 text-sm text-ink">
          <span>{eventsError}</span>
          <button type="button" onClick={() => setEventsError(null)} className="shrink-0 p-1 rounded hover:bg-amber-200" aria-label="Dismiss">×</button>
        </div>
      )}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-ink/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg text-ink hover:bg-ink/10 transition-colors"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-ink">Calendar</h1>
              <p className="text-xs text-ink/60">Events & schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={goToday} className="px-3 py-1.5 text-sm font-medium text-ink bg-white border border-ink/20 rounded-lg hover:bg-ink/5">
              Today
            </button>
            <div className="flex rounded-lg border border-ink/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'month' ? 'bg-ink text-white' : 'bg-white text-ink/70 hover:bg-ink/5'}`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'agenda' ? 'bg-ink text-white' : 'bg-white text-ink/70 hover:bg-ink/5'}`}
              >
                Agenda
              </button>
            </div>
            <button type="button" onClick={handleExportMonth} className="p-2 rounded-lg border border-ink/20 text-ink/70 hover:bg-ink/5 hover:text-ink" title="Export month to CSV">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
            <button type="button" onClick={() => window.print()} className="p-2 rounded-lg border border-ink/20 text-ink/70 hover:bg-ink/5 hover:text-ink" title="Print">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4 0H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 pb-8">
        {eventsLoading && (
          <p className="text-sm text-ink/60 mb-4">Loading your events…</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={goPrev} className="p-2 rounded-lg border border-ink/20 text-ink hover:bg-white shadow-sm" aria-label="Previous month">←</button>
            <h2 className="text-xl font-semibold text-ink min-w-[200px] text-center">{MONTHS[month]} {year}</h2>
            <button type="button" onClick={goNext} className="p-2 rounded-lg border border-ink/20 text-ink hover:bg-white shadow-sm" aria-label="Next month">→</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink/60">{totalEventsThisMonth} event{totalEventsThisMonth !== 1 ? 's' : ''} this month</span>
            <div className="flex rounded-lg border border-ink/20 overflow-hidden bg-white">
              {['all', 'mine', 'global'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize ${filter === f ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/5'}`}
                >
                  {f === 'all' ? 'All' : f === 'mine' ? 'My events' : 'Global'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px] text-ink/60">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ink/40" /> Global</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Yours</span>
          <span className="flex items-center gap-1.5">
            <strong className="text-ink/70">Add to Google:</strong> use &quot;Add to Google&quot; on any event to open it in Google Calendar
          </span>
        </div>

        {viewMode === 'month' && (
          <div className="rounded-xl border border-ink/15 overflow-hidden bg-white shadow-sm print:shadow-none">
            <div className="grid grid-cols-7 border-b border-ink/15 bg-ink/5">
              {DAY_LABELS.map((l, i) => (
                <div key={i} className="py-2.5 text-center text-xs font-semibold text-ink/70">{l}</div>
              ))}
            </div>
            <div className="divide-y divide-ink/10">
              {grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 min-h-[88px]">
                  {week.map((cell, ci) => {
                    const key = toDateKey(cell.date)
                    const isToday = key === todayKey
                    const events = key ? eventsForDate(key) : []
                    const isSelected = selectedDate && toDateKey(selectedDate) === key
                    return (
                      <button
                        key={ci}
                        type="button"
                        onClick={() => cell.date && (setSelectedDate(cell.date), setShowAddForm(false), setEditingEventId(null))}
                        className={`min-h-[88px] p-2 text-left border-r border-ink/10 last:border-r-0 flex flex-col transition-colors ${cell.day == null ? 'bg-ink/[0.03]' : 'hover:bg-ink/5'} ${isToday ? 'ring-1 ring-ink/30 ring-inset bg-amber-50/50' : ''} ${isSelected ? 'bg-amber-100/80' : ''}`}
                      >
                        {cell.day != null && (
                          <>
                            <span className="text-sm font-medium text-ink">{cell.day}</span>
                            {events.length > 0 && (
                              <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                                {events.slice(0, 3).map((ev, i) => (
                                  <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${ev.type === 'global' ? 'bg-ink/15 text-ink' : 'bg-amber-200/80 text-ink'}`} title={ev.title}>{ev.title}</span>
                                ))}
                                {events.length > 3 && <span className="text-[10px] text-ink/50">+{events.length - 3}</span>}
                              </div>
                            )}
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'agenda' && (
          <div className="rounded-xl border border-ink/15 overflow-hidden bg-white shadow-sm">
            {agendaItems.length === 0 ? (
              <div className="py-12 text-center text-ink/50 text-sm">No events this month. Select a date in Month view to add one.</div>
            ) : (
              <ul className="divide-y divide-ink/10">
                {agendaItems.map(({ date, dateKey, events }) => (
                  <li key={dateKey} className="p-4 hover:bg-ink/[0.02]">
                    <div className="text-xs font-semibold text-ink/60 mb-2">
                      {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <ul className="space-y-2">
                      {events.map((ev, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink">{ev.title}</p>
                            {(ev.loc || ev.time) && <p className="text-xs text-ink/60">{[ev.loc, ev.time].filter(Boolean).join(' · ')}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <a
                              href={getGoogleCalendarEventUrl({ title: ev.title, date: dateKey, time: ev.time, loc: ev.loc, description: ev.description })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-ink/70 hover:text-ink"
                              title="Add to Google Calendar"
                            >
                              Add to Google
                            </a>
                            <span className={`text-[10px] px-2 py-0.5 rounded ${ev.type === 'global' ? 'bg-ink/15' : 'bg-amber-100 text-ink'}`}>{ev.type === 'global' ? 'Global' : 'Yours'}</span>
                            {ev.type === 'user' && ev.id && (
                              <span className="flex gap-2">
                                <button type="button" onClick={() => startEditingEvent(ev, date)} className="text-ink/70 hover:text-ink text-xs">Edit</button>
                                <button type="button" onClick={() => handleDeleteUserEvent(ev.id)} className="text-red-600 hover:underline text-xs">Remove</button>
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {selectedDate && (
          <section id="calendar-date-panel" className="mt-6 rounded-xl border border-ink/15 bg-white shadow-sm overflow-hidden print:shadow-none">
            <div className="px-4 py-3 border-b border-ink/10 flex items-center justify-between">
              <h3 className="font-semibold text-ink">
                {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button type="button" onClick={() => { setSelectedDate(null); setShowAddForm(false); setEditingEventId(null); setNewEvent({ title: '', loc: '', description: '', time: '', type: 'other' }); }} className="p-1 rounded text-ink/60 hover:bg-ink/10" aria-label="Close">×</button>
            </div>
            <div className="p-4">
              <ul className="space-y-3 mb-4">
                {eventsForDate(toDateKey(selectedDate)).length === 0 && !showAddForm && (
                  <li className="text-sm text-ink/50">No events. Add one below.</li>
                )}
                {eventsForDate(toDateKey(selectedDate)).map((ev, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2 border-b border-ink/10 last:border-0">
                    <div>
                      <p className="font-medium text-ink">{ev.title}</p>
                      {(ev.loc || ev.time) && <p className="text-xs text-ink/60 mt-0.5">{[ev.loc, ev.time].filter(Boolean).join(' · ')}</p>}
                      {ev.description && <p className="text-xs text-ink/70 mt-1">{ev.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <a
                        href={getGoogleCalendarEventUrl({ title: ev.title, date: toDateKey(selectedDate), time: ev.time, loc: ev.loc, description: ev.description })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ink/70 hover:text-ink flex items-center gap-1"
                        title="Add to Google Calendar"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Add to Google
                      </a>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${ev.type === 'global' ? 'bg-ink/15' : 'bg-amber-100'}`}>{ev.type === 'global' ? 'Global' : 'Yours'}</span>
                      {ev.type === 'user' && ev.id && (
                        <span className="flex gap-2">
                          <button type="button" onClick={() => startEditingEvent(ev, selectedDate)} className="text-ink/70 hover:text-ink text-xs">Edit</button>
                          <button type="button" onClick={() => handleDeleteUserEvent(ev.id)} className="text-red-600 hover:underline text-xs">Remove</button>
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {!showAddForm ? (
                <button type="button" onClick={() => { setShowAddForm(true); setEditingEventId(null); setNewEvent({ title: '', loc: '', description: '', time: '', type: 'other' }); }} className="text-sm font-medium text-ink/80 hover:text-ink flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full border-2 border-ink/40 flex items-center justify-center text-ink/60">+</span>
                  Add event
                </button>
              ) : (
                <div className="space-y-3 pt-2 border-t border-ink/10">
                  <h4 className="text-sm font-semibold text-ink">{editingEventId ? 'Edit event' : 'New event'}</h4>
                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1">Date</label>
                    <input
                      type="date"
                      value={toDateKey(selectedDate)}
                      onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
                      className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Event title"
                      className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm focus:ring-2 focus:ring-ink/20 focus:border-ink/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink/70 mb-1">Time (optional)</label>
                      <input
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink/70 mb-1">Type</label>
                      <select
                        value={newEvent.type}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm"
                      >
                        {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1">Location (optional)</label>
                    <input
                      type="text"
                      value={newEvent.loc}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, loc: e.target.value }))}
                      placeholder="Location"
                      className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1">Description (optional)</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Notes or description"
                      rows={2}
                      className="w-full px-3 py-2 border border-ink/20 rounded-lg text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleSaveEvent} disabled={!newEvent.title.trim()} className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 disabled:opacity-50">
                      {editingEventId ? 'Save changes' : 'Save event'}
                    </button>
                    <button type="button" onClick={() => { setShowAddForm(false); setEditingEventId(null); setNewEvent({ title: '', loc: '', description: '', time: '', type: 'other' }); }} className="px-4 py-2 border border-ink/20 rounded-lg text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <button
        type="button"
        onClick={openAddEventFromFab}
        className="fixed z-[90] right-4 bottom-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))] md:bottom-6 md:right-6 w-14 h-14 md:w-14 md:h-14 rounded-full bg-ink text-white shadow-lg hover:bg-ink/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 flex items-center justify-center print:hidden"
        aria-label="Add event"
        title="Add event"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <style>{`
        @media print {
          .min-h-full { min-height: auto !important; }
          header button, .print\\:shadow-none { box-shadow: none !important; }
          button[aria-label="Back to dashboard"], button[title], button[aria-label="Add event"], .flex.rounded-lg.border.border-ink\\/20.overflow-hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
