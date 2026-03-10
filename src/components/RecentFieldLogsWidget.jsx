import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

function timeAgo(iso) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function chipForText(text) {
  const t = String(text || '').toLowerCase()
  if (t.includes('ceramic') || t.includes('sherd')) return { label: 'Ceramic', cls: 'bg-amber-50 text-amber-900 border-amber-200' }
  if (t.includes('lithic') || t.includes('stone') || t.includes('flake')) return { label: 'Lithic', cls: 'bg-stone-50 text-stone-900 border-stone-200' }
  if (t.includes('metal') || t.includes('bronze') || t.includes('iron')) return { label: 'Metal', cls: 'bg-slate-50 text-slate-900 border-slate-200' }
  if (t.includes('organic') || t.includes('bone') || t.includes('charcoal')) return { label: 'Organic', cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
  return { label: 'Log', cls: 'bg-parchment-50 text-ink/80 border-ink/15' }
}

export default function RecentFieldLogsWidget({ profile, limit = 6 }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  const role = profile?.role
  const isChief = role === 'Director'
  const isFieldArch = role === 'Field Archeologist'
  const isArcheologist = isChief || isFieldArch

  useEffect(() => {
    let cancelled = false

    async function fetchLogs() {
      if (!isArcheologist || !profile?.id || !supabase) {
        if (!cancelled) setRows([])
        if (!cancelled) setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Field archeologist: only their logs. Director: latest logs across all sites.
        let q = supabase
          .from('site_journals')
          .select('id, site_id, findings, notes, created_at, sites(name), profiles:user_id(full_name)')
          .order('created_at', { ascending: false })
          .limit(limit)

        if (isFieldArch) q = q.eq('user_id', profile.id)

        const { data, error } = await q
        if (error) throw error
        if (!cancelled) setRows(data || [])
      } catch (_) {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLogs()
    return () => { cancelled = true }
  }, [profile?.id, profile?.role, isArcheologist, isFieldArch, limit])

  const headline = useMemo(() => (isChief ? 'Team activity (latest)' : 'Your activity (latest)'), [isChief])

  if (!isArcheologist) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-2 min-h-0">
        <span className="text-ink/60 text-xs font-medium">Recent field logs</span>
        <p className="text-[9px] text-ink/50 mt-0.5 text-center">Latest journal entries for archeologists.</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 rounded-xl border border-ink/15 bg-white/70 backdrop-blur-sm p-3 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/60">Recent Field Logs</p>
            <p className="text-xs font-semibold text-ink/70 mt-0.5">{headline}</p>
          </div>
          <div className="w-9 h-9 rounded-xl border border-ink/15 bg-parchment-50 flex items-center justify-center shrink-0" aria-hidden>
            <svg className="w-4.5 h-4.5 text-ink/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-2 rounded-xl border border-ink/15 bg-white/55 backdrop-blur-sm overflow-hidden shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
        {loading ? (
          <div className="p-3">
            <p className="text-[10px] text-ink/50">Loading entries…</p>
            <div className="mt-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-ink/5 border border-ink/10 animate-pulse" />
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-3">
            <p className="text-[10px] text-ink/50">No entries yet.</p>
            <p className="text-[10px] text-ink/50 mt-1">Log a field journal entry to see it here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {rows.map((r) => {
              const body = r.findings || r.notes || ''
              const chip = chipForText(body)
              return (
                <li key={r.id} className="p-3 hover:bg-white/35 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${chip.cls}`}>{chip.label}</span>
                        <span className="text-[10px] font-semibold text-ink truncate" title={r.sites?.name || ''}>
                          {r.sites?.name || 'Site'}
                        </span>
                        <span className="text-[10px] text-ink/50">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-ink/70 mt-1 leading-snug line-clamp-2">
                        {String(body).trim() || '—'}
                      </p>
                      {isChief && r.profiles?.full_name ? (
                        <p className="text-[10px] text-ink/50 mt-1">by {r.profiles.full_name}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[10px] text-ink/40" aria-hidden>→</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

