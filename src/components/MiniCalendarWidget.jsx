import { useState, useMemo } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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

function eventDateKey(e, year) {
  const m = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(String(e.month).toUpperCase())
  if (m < 0) return null
  const d = parseInt(e.day, 10)
  if (Number.isNaN(d) || d < 1 || d > 31) return null
  const date = new Date(year, m, d)
  if (date.getMonth() !== m || date.getDate() !== d) return null
  return `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function toKey(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function MiniCalendarWidget({ onOpenCalendar, globalEvents = [] }) {
  const [base] = useState(() => new Date())
  const year = base.getFullYear()
  const month = base.getMonth()
  const grid = useMemo(() => getMonthGrid(year, month), [year, month])
  const eventKeys = useMemo(() => {
    const set = new Set()
    globalEvents.forEach(e => {
      const k = eventDateKey(e, year)
      if (k) set.add(k)
    })
    return set
  }, [globalEvents, year])
  const todayKey = toKey(base)

  const upcomingPreview = useMemo(() => {
    const now = base.getTime()
    return globalEvents
      .map(e => {
        const k = eventDateKey(e, year)
        if (!k) return null
        const [y, m, d] = k.split('-').map(Number)
        const t = new Date(y, m - 1, d).getTime()
        if (t < now) return null
        return { ...e, dateKey: k, time: t }
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time)
      .slice(0, 2)
  }, [globalEvents, year, base])

  return (
    <div className="h-full flex flex-col min-h-0 rounded-xl bg-white/80 border border-ink/10 shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-ink/10 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Calendar</h3>
        <span className="text-[10px] font-medium text-ink/50 uppercase tracking-wide">{MONTHS[month]} {year}</span>
      </div>
      <div className="flex-1 min-h-0 p-3 flex flex-col">
        <div className="grid grid-cols-7 gap-0.5 mb-2">
          {DAY_LABELS.map((l, i) => (
            <span key={i} className="text-[10px] font-semibold text-ink/50 text-center py-0.5">{l}</span>
          ))}
          {grid.flat().map((cell, i) => {
            const key = toKey(cell.date)
            const hasEvent = key && eventKeys.has(key)
            const isToday = key === todayKey
            return (
              <span
                key={i}
                className={`
                  aspect-square max-w-[28px] w-full mx-auto flex items-center justify-center rounded-lg text-[11px] font-medium
                  ${cell.day == null ? 'invisible' : ''}
                  ${cell.day != null && !hasEvent && !isToday ? 'text-ink/70' : ''}
                  ${hasEvent ? 'bg-ink text-white' : ''}
                  ${isToday && !hasEvent ? 'ring-1 ring-ink/40 ring-inset bg-ink/10 text-ink' : ''}
                `}
              >
                {cell.day ?? ''}
              </span>
            )
          })}
        </div>
        {upcomingPreview.length > 0 && (
          <div className="mt-auto pt-2 border-t border-ink/10 space-y-1">
            {upcomingPreview.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="shrink-0 w-6 h-6 rounded bg-ink/15 text-ink font-semibold flex items-center justify-center">{e.day}</span>
                <span className="truncate text-ink/80">{e.title}</span>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpenCalendar?.()}
          className="mt-3 w-full py-2 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-ink/90 transition-colors flex items-center justify-center gap-1.5"
        >
          Open full calendar
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
