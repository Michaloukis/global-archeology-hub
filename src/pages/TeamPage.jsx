import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UserRoleProvider, useUserRole } from '../contexts/UserRoleContext'
import TeamsHub from '../components/teams/TeamsHub'
import TeamDashboard from '../components/teams/TeamDashboard'
import { getTeamById, listTeamsForUser } from '../services/teamsApi'
import {
  applyToTeamDemo,
  clearDemoTeamsState,
  createTeamDemo,
  ensureDemoTeamsState,
  getDemoTeamsState,
  getTeamByIdDemo,
  inviteToTeamDemo,
  isMissingTeamsSchemaError,
  listTeamsForUserDemo,
  searchTeamsDemo,
} from '../services/teamsDemoApi'
import { applyToTeam, createTeam, inviteToTeam, publishDemoTeamsToDb, searchTeams } from '../services/teamsApi'

function parseTeamId(pathname) {
  const m = pathname.match(/^\/teams\/([^/]+)\/*$/i)
  return m?.[1] || ''
}

function TeamPageInner({ profile, onBack }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDirector } = useUserRole()
  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsError, setTeamsError] = useState('')
  const [selectedTeamOverride, setSelectedTeamOverride] = useState(null)
  const [demoMode, setDemoMode] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishError, setPublishError] = useState('')

  const teamId = parseTeamId(location.pathname)
  const selectedTeam = useMemo(
    () => selectedTeamOverride || teams.find((t) => String(t.id) === String(teamId)) || null,
    [teams, teamId, selectedTeamOverride],
  )

  const openTeam = (id) => navigate(`/teams/${id}`)
  const goHub = () => navigate('/teams')

  const reloadTeams = async () => {
    setTeamsLoading(true)
    setTeamsError('')
    try {
      const userId = profile?.id
      if (!userId) throw new Error('Missing profile id')
      const data = demoMode
        ? await listTeamsForUserDemo({ userId, isDirector })
        : await listTeamsForUser({ userId, isDirector })
      setTeams(Array.isArray(data) ? data : [])
    } catch (e) {
      if (isMissingTeamsSchemaError(e)) {
        setDemoMode(true)
        const userId = profile?.id
        const data = await listTeamsForUserDemo({ userId, isDirector })
        setTeams(Array.isArray(data) ? data : [])
      } else {
        setTeamsError(e?.message || 'Failed to load teams')
      }
    } finally {
      setTeamsLoading(false)
    }
  }

  useEffect(() => {
    reloadTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isDirector])

  useEffect(() => {
    ;(async () => {
      if (!teamId) {
        setSelectedTeamOverride(null)
        return
      }
      // If it's already in the list, don't refetch.
      if (teams.some((t) => String(t.id) === String(teamId))) {
        setSelectedTeamOverride(null)
        return
      }
      try {
        const t = demoMode ? await getTeamByIdDemo(teamId) : await getTeamById(teamId)
        setSelectedTeamOverride(t)
      } catch (_) {
        setSelectedTeamOverride(null)
      }
    })()
  }, [teamId, teams, demoMode])

  const hubApi = demoMode
    ? { createTeam: createTeamDemo, searchTeams: searchTeamsDemo, applyToTeam: applyToTeamDemo }
    : { createTeam, searchTeams, applyToTeam }

  const dashboardApi = demoMode ? { inviteToTeam: inviteToTeamDemo } : { inviteToTeam }

  return (
    <div className="parchment-main min-h-full p-4 pb-28 md:p-8">
      <div className="max-w-none md:max-w-[1400px] md:mx-auto w-full space-y-4 md:space-y-5">
        {/* Desktop header row (mobile already has app header) */}
        <div className="hidden md:flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-ink">Teams</h1>
            {profile?.role ? (
              <span className="text-[10px] font-semibold text-ink/70 bg-white/60 border border-ink/10 px-2 py-1 rounded-full">
                Role: {profile.role}
              </span>
            ) : null}
          </div>
          {onBack ? (
            <button
              type="button"
              onClick={() => {
                onBack()
                try {
                  if (location.pathname.toLowerCase().startsWith('/teams')) navigate('/')
                } catch (_) {}
              }}
              className="rounded-xl border border-ink/15 bg-white/70 text-ink px-4 py-2.5 text-sm font-semibold hover:bg-white min-h-[44px] shrink-0"
            >
              ← Back to Hub
            </button>
          ) : null}
        </div>

        {/* Mobile: native card stack. Desktop: card container. */}
        <div className="space-y-4 md:space-y-0 md:rounded-3xl md:border md:border-ink/10 md:bg-white/50 md:backdrop-blur-sm md:shadow-[0_2px_18px_rgba(44,40,37,0.06)] md:p-6">
          {teamsError ? (
            <div className="mb-3 md:mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 md:p-4">
              <p className="text-sm font-semibold text-amber-900">Teams data unavailable</p>
              <p className="text-xs text-amber-900/70 mt-1">{teamsError}</p>
              <p className="text-[11px] text-amber-900/70 mt-2">
                This page now relies on Supabase tables (e.g. <span className="font-semibold">teams</span>,{' '}
                <span className="font-semibold">team_members</span>, <span className="font-semibold">team_applications</span>,{' '}
                <span className="font-semibold">team_invitations</span>). If your schema uses different names, update{' '}
                <span className="font-semibold">`src/services/teamsApi.js`</span>.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={reloadTeams}
                  className="rounded-xl border border-ink/15 bg-white/70 px-4 py-2 text-xs font-semibold text-ink hover:bg-white"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}
          {demoMode ? (
            <div className="mb-3 md:mb-4 rounded-2xl border border-ink/10 bg-white/60 p-3 md:p-4">
              <p className="text-sm font-semibold text-ink">Demo data mode</p>
              <p className="text-xs text-ink/60 mt-1">
                Your database doesn’t have Teams tables yet, so the app is showing realistic local records to match the normal UI flow.
              </p>
              {isDirector ? (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      setPublishLoading(true)
                      setPublishError('')
                      try {
                        const state = getDemoTeamsState()
                        await publishDemoTeamsToDb({ profile, demoState: state })
                        clearDemoTeamsState()
                        setDemoMode(false)
                        await reloadTeams()
                      } catch (e) {
                        setPublishError(e?.message || 'Failed to publish demo data')
                      } finally {
                        setPublishLoading(false)
                      }
                    }}
                    disabled={publishLoading}
                    className="rounded-xl border border-ink/20 bg-ink text-white px-4 py-2 text-xs font-semibold hover:bg-ink/90 disabled:opacity-60"
                  >
                    {publishLoading ? 'Publishing…' : 'Publish demo teams to database'}
                  </button>
                  {publishError ? <span className="text-xs font-semibold text-amber-800">{publishError}</span> : null}
                  <span className="text-[11px] text-ink/60">
                    This will only work after Teams tables exist in Supabase.
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {!demoMode && !teamsLoading && !teamsError && teams.length === 0 ? (
            <div className="mb-3 md:mb-4 rounded-2xl border border-ink/10 bg-white/60 p-3 md:p-4">
              <p className="text-sm font-semibold text-ink">No teams found in database</p>
              <p className="text-xs text-ink/60 mt-1">
                Your Teams tables exist now, but there are no team records associated with your account yet.
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    setDemoMode(true)
                    const userId = profile?.id
                    const data = await listTeamsForUserDemo({ userId, isDirector })
                    setTeams(Array.isArray(data) ? data : [])
                  }}
                  className="rounded-xl border border-ink/15 bg-white/70 px-4 py-2 text-xs font-semibold text-ink hover:bg-white"
                >
                  Restore demo teams (local)
                </button>
                {isDirector ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setPublishLoading(true)
                      setPublishError('')
                      try {
                        const state = ensureDemoTeamsState()
                        await publishDemoTeamsToDb({ profile, demoState: state })
                        clearDemoTeamsState()
                        await reloadTeams()
                      } catch (e) {
                        setPublishError(e?.message || 'Failed to publish demo data')
                      } finally {
                        setPublishLoading(false)
                      }
                    }}
                    disabled={publishLoading}
                    className="rounded-xl border border-ink/20 bg-ink text-white px-4 py-2 text-xs font-semibold hover:bg-ink/90 disabled:opacity-60"
                  >
                    {publishLoading ? 'Publishing…' : 'Create sample teams in DB'}
                  </button>
                ) : null}
                {publishError ? <span className="text-xs font-semibold text-amber-800">{publishError}</span> : null}
              </div>
            </div>
          ) : null}

          {!selectedTeam ? (
            <TeamsHub
              profile={profile}
              teams={teams}
              loading={teamsLoading}
              onRefresh={reloadTeams}
              onOpenTeam={openTeam}
              api={hubApi}
              embedded
            />
          ) : (
            <TeamDashboard team={selectedTeam} profile={profile} onBack={goHub} onTeamUpdated={reloadTeams} api={dashboardApi} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeamPage({ profile, onBack }) {
  return (
    <UserRoleProvider profile={profile}>
      <TeamPageInner profile={profile} onBack={onBack} />
    </UserRoleProvider>
  )
}
