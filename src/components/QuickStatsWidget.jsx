import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function siteVisibility(site) {
  return site?.visibility ?? (site?.is_public === false ? 'private' : 'public')
}

export default function QuickStatsWidget({ profile, onOpenMap, onOpenJournal }) {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)

  const isChief = profile?.role === 'Director'
  const isFieldArch = profile?.role === 'Field Archeologist'
  const isArcheologist = isChief || isFieldArch

  useEffect(() => {
    let cancelled = false

    async function fetchSitesForArcheologist() {
      if (!isArcheologist || !profile?.id || !supabase) {
        if (!cancelled) setSites([])
        if (!cancelled) setLoading(false)
        return
      }

      try {
        if (isFieldArch) {
          const { data: reg } = await supabase
            .from('Registry')
            .select('site_id')
            .eq('field_arch_id', profile.id)
            .eq('status', 'Approved')
          const siteIds = [...new Set((reg || []).map(r => r.site_id).filter(Boolean))]
          if (siteIds.length === 0) {
            if (!cancelled) setSites([])
            if (!cancelled) setLoading(false)
            return
          }
          const { data: siteRows } = await supabase
            .from('sites')
            .select('id, name, status')
            .in('id', siteIds)
          if (!cancelled) setSites(siteRows || [])
        } else if (isChief) {
          const { data: allSites } = await supabase.from('sites').select('id, name, status, visibility, is_public, created_by')
          const list = (allSites || []).filter(s => {
            const vis = siteVisibility(s)
            return s.created_by === profile.id || vis === 'team'
          })
          if (!cancelled) setSites(list)
        } else {
          if (!cancelled) setSites([])
        }
      } catch (_) {
        if (!cancelled) setSites([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSitesForArcheologist()
    return () => { cancelled = true }
  }, [profile?.id, profile?.role, isChief, isFieldArch, isArcheologist])

  if (!isArcheologist) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-2 min-h-0">
        <span className="text-ink/60 text-xs font-medium">Quick stats</span>
        <p className="text-[9px] text-ink/50 mt-0.5 text-center">Dig site status for archeologists.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden rounded-lg">
      <div className="flex items-center px-2 py-1 border-b border-ink/20 shrink-0">
        <span className="text-[10px] font-semibold text-ink">Quick stats</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {loading ? (
          <p className="text-[10px] text-ink/50">Loading dig sites…</p>
        ) : sites.length === 0 ? (
          <p className="text-[10px] text-ink/50">
            {isFieldArch ? 'No approved expeditions yet. Apply from the Map.' : 'No sites under your oversight yet.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sites.map(site => (
              <li key={site.id}>
                <button
                  type="button"
                  onClick={() => onOpenJournal?.(site.id)}
                  className="w-full flex items-center justify-between gap-2 text-xs rounded px-1 py-0.5 -mx-1 hover:bg-ink/5 active:bg-ink/10 transition-colors text-left"
                  title={`Open journal for ${site.name}`}
                >
                  <span className="font-medium text-ink truncate min-w-0">{site.name}</span>
                  <span
                    className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 border border-ink/30 rounded ${
                      site.status === 'Finished' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {site.status || '—'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
