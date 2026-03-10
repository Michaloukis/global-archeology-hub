import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import SiteProgressWidget from './widgets/SiteProgressWidget.jsx'

function siteVisibility(site) {
  return site?.visibility ?? (site?.is_public === false ? 'private' : 'public')
}

function estimatePercent(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('finish')) return 100
  if (s.includes('progress') || s.includes('active')) return 65
  if (s.includes('planned') || s.includes('pending')) return 20
  return 40
}

export default function SiteProgressDashboardWidget({ profile }) {
  const [loading, setLoading] = useState(true)
  const [site, setSite] = useState(null)

  const role = profile?.role
  const isChief = role === 'Director'
  const isFieldArch = role === 'Field Archeologist'
  const isArcheologist = isChief || isFieldArch

  useEffect(() => {
    let cancelled = false

    async function fetchOneSite() {
      if (!isArcheologist || !profile?.id || !supabase) {
        if (!cancelled) setSite(null)
        if (!cancelled) setLoading(false)
        return
      }

      setLoading(true)
      try {
        if (isFieldArch) {
          const { data: reg } = await supabase
            .from('Registry')
            .select('site_id')
            .eq('field_arch_id', profile.id)
            .eq('status', 'Approved')

          const siteIds = [...new Set((reg || []).map(r => r.site_id).filter(Boolean))]
          if (siteIds.length === 0) {
            if (!cancelled) setSite(null)
            return
          }

          const { data: siteRows } = await supabase
            .from('sites')
            .select('id, name, status')
            .in('id', siteIds)

          const list = (siteRows || []).slice().sort((a, b) => {
            const aDone = String(a.status || '').toLowerCase().includes('finish')
            const bDone = String(b.status || '').toLowerCase().includes('finish')
            return Number(aDone) - Number(bDone)
          })
          if (!cancelled) setSite(list[0] || null)
        } else if (isChief) {
          const { data: allSites } = await supabase
            .from('sites')
            .select('id, name, status, visibility, is_public, created_by')

          const list = (allSites || []).filter(s => {
            const vis = siteVisibility(s)
            return s.created_by === profile.id || vis === 'team'
          })
          const pick = list.slice().sort((a, b) => {
            const aDone = String(a.status || '').toLowerCase().includes('finish')
            const bDone = String(b.status || '').toLowerCase().includes('finish')
            return Number(aDone) - Number(bDone)
          })[0]
          if (!cancelled) setSite(pick || null)
        }
      } catch (_) {
        if (!cancelled) setSite(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchOneSite()
    return () => { cancelled = true }
  }, [profile?.id, profile?.role, isArcheologist, isChief, isFieldArch])

  const percent = useMemo(() => estimatePercent(site?.status), [site?.status])

  if (!isArcheologist) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-2 min-h-0">
        <span className="text-ink/60 text-xs font-medium">Site progress</span>
        <p className="text-[9px] text-ink/50 mt-0.5 text-center">Excavation completion for archeologists.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-2 min-h-0">
        <span className="text-ink/60 text-xs font-medium">Site progress</span>
        <p className="text-[10px] text-ink/50 mt-1">Loading…</p>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-2 min-h-0">
        <span className="text-ink/60 text-xs font-medium">Site progress</span>
        <p className="text-[10px] text-ink/50 mt-1 text-center">No assigned sites yet.</p>
      </div>
    )
  }

  return (
    <SiteProgressWidget
      title="Site Progress"
      siteName={site.name}
      subtitle={site.status ? `Status: ${site.status}` : undefined}
      percentComplete={percent}
    />
  )
}

