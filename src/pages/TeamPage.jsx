import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UserRoleProvider, useUserRole } from '../contexts/UserRoleContext'
import TeamsHub from '../components/teams/TeamsHub'
import TeamDashboard from '../components/teams/TeamDashboard'

function parseTeamId(pathname) {
  const m = pathname.match(/^\/teams\/([^/]+)\/*$/i)
  return m?.[1] || ''
}

function RoleSwitcher() {
  const { profileRole, mockRole, setMockRole, clearMockRole, role } = useUserRole()
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold text-ink/60">Viewer role</span>
      <div className="inline-flex rounded-xl border border-ink/15 bg-white/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setMockRole('Director')}
          className={`px-3 py-1.5 text-xs font-semibold ${role === 'Director' ? 'bg-ink text-white' : 'text-ink/70 hover:bg-white/60'}`}
        >
          Director
        </button>
        <button
          type="button"
          onClick={() => setMockRole('Field Archaeologist')}
          className={`px-3 py-1.5 text-xs font-semibold ${role === 'Field Archaeologist' ? 'bg-ink text-white' : 'text-ink/70 hover:bg-white/60'}`}
        >
          Field Archaeologist
        </button>
      </div>
      <button
        type="button"
        onClick={clearMockRole}
        className="text-xs font-semibold text-ink/60 hover:text-ink rounded-lg px-2 py-1 hover:bg-white/60"
        title={profileRole ? `Profile role detected: ${profileRole}` : 'No profile role detected'}
      >
        Reset
      </button>
      {mockRole ? (
        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
          Mocking: {mockRole}
        </span>
      ) : profileRole ? (
        <span className="text-[10px] font-semibold text-ink/70 bg-white/60 border border-ink/10 px-2 py-1 rounded-full">
          Profile: {profileRole}
        </span>
      ) : null}
    </div>
  )
}

function TeamPageInner({ profile, onBack }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [teams, setTeams] = useState(() => [
    {
      id: 'atlas',
      name: 'Atlas Basin Survey',
      region: 'Morocco · High Atlas',
      tagline: 'Survey transects, rapid documentation, and site sampling.',
      activeDigSites: 3,
      memberCount: 12,
      visibility: 'Active',
      pendingJoinRequests: 4,
      projectProgress: 61,
      reports7d: 11,
      artifacts7d: 29,
      qcBacklog: 7,
      openTasks: 24,
    },
    {
      id: 'valeriana',
      name: 'Valeriana Lidar Follow-Up',
      region: 'Mexico · Campeche',
      tagline: 'Ground-truthing lidar anomalies and mapping features.',
      activeDigSites: 5,
      memberCount: 18,
      visibility: 'Active',
      pendingJoinRequests: 2,
      projectProgress: 74,
      reports7d: 17,
      artifacts7d: 42,
      qcBacklog: 12,
      openTasks: 31,
    },
    {
      id: 'crete',
      name: 'Papoura Hilltop Team',
      region: 'Greece · Crete',
      tagline: 'Monumental structure excavation and materials analysis.',
      activeDigSites: 2,
      memberCount: 9,
      visibility: 'Active',
      pendingJoinRequests: 1,
      projectProgress: 48,
      reports7d: 8,
      artifacts7d: 19,
      qcBacklog: 4,
      openTasks: 16,
    },
    {
      id: 'pompeii',
      name: 'Pompeii Fresco Unit',
      region: 'Italy · Campania',
      tagline: 'Conservation-first documentation and finds processing.',
      activeDigSites: 4,
      memberCount: 15,
      visibility: 'Active',
      pendingJoinRequests: 5,
      projectProgress: 57,
      reports7d: 13,
      artifacts7d: 36,
      qcBacklog: 10,
      openTasks: 28,
    },
  ])

  const teamId = parseTeamId(location.pathname)
  const selectedTeam = useMemo(() => teams.find((t) => t.id === teamId) || null, [teams, teamId])

  const openTeam = (id) => navigate(`/teams/${id}`)
  const goHub = () => navigate('/teams')

  return (
    <div className="relative parchment-main min-h-full p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <RoleSwitcher />
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

        <div className="mt-5 rounded-3xl border border-ink/10 bg-white/50 backdrop-blur-sm shadow-[0_2px_18px_rgba(44,40,37,0.06)] p-5 md:p-6">
          {!selectedTeam ? (
            <TeamsHub
              profile={profile}
              teams={teams}
              onOpenTeam={openTeam}
              onCreateTeam={(name) => {
                const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `team-${Date.now()}`
                const newTeam = {
                  id,
                  name,
                  region: 'Unspecified region',
                  tagline: 'Newly initialized team.',
                  activeDigSites: 0,
                  memberCount: 1,
                  visibility: 'Active',
                  pendingJoinRequests: 0,
                  projectProgress: 0,
                  reports7d: 0,
                  artifacts7d: 0,
                  qcBacklog: 0,
                  openTasks: 0,
                }
                setTeams((prev) => [newTeam, ...prev])
                openTeam(id)
              }}
            />
          ) : (
            <TeamDashboard team={selectedTeam} profile={profile} onBack={goHub} />
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
