import React, { useMemo, useState } from 'react'
import { useUserRole } from '../../contexts/UserRoleContext'
import InviteForm from './InviteForm'
import RoleManager from './RoleManager'
import { inviteToTeam } from '../../services/teamsApi'

const SECTIONS = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'digsites', label: 'Digsites' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'reports', label: 'Reports' },
  { id: 'messages', label: 'Groups & Messages' },
  { id: 'posts', label: 'Posts' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'archives', label: 'Archives' },
  { id: 'settings', label: 'Settings' },
]

function Chip({ children }) {
  return <span className="text-[11px] font-semibold text-ink/70 bg-white/60 border border-ink/10 px-2 py-1 rounded-full">{children}</span>
}

function EmptyPane({ title, body }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <p className="text-xs text-ink/60 mt-1">{body}</p>
    </div>
  )
}

function DirectorWidgets({ team }) {
  const pending = team?.pendingJoinRequests ?? 3
  const progress = team?.projectProgress ?? 62
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
        <h3 className="text-sm font-bold text-ink">High-level analytics</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
            <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-wide">Active sites</p>
            <p className="text-xl font-bold text-ink mt-1 leading-none">{team?.activeDigSites ?? 0}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
            <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-wide">Members</p>
            <p className="text-xl font-bold text-ink mt-1 leading-none">{team?.memberCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
            <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-wide">Reports (7d)</p>
            <p className="text-xl font-bold text-ink mt-1 leading-none">{team?.reports7d ?? 14}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
            <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-wide">Artifacts (7d)</p>
            <p className="text-xl font-bold text-ink mt-1 leading-none">{team?.artifacts7d ?? 38}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
        <h3 className="text-sm font-bold text-ink">Pending join requests</h3>
        <p className="text-xs text-ink/60 mt-1">Review applications and quickly assign a role.</p>
        <div className="mt-3 rounded-xl border border-ink/10 bg-parchment-100/40 p-4">
          <p className="text-3xl font-black text-ink leading-none">{pending}</p>
          <p className="text-xs text-ink/60 mt-1">Awaiting decision</p>
          <button type="button" className="mt-3 rounded-xl border border-ink/20 bg-ink text-white px-4 py-2 text-xs font-semibold hover:bg-ink/90">
            Review requests
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
        <h3 className="text-sm font-bold text-ink">Overall project progress</h3>
        <p className="text-xs text-ink/60 mt-1">A compact “Director” progress snapshot.</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink/70">
            <span>Milestones complete</span>
            <span className="font-semibold text-ink">{progress}%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-ink/10 border border-ink/10 overflow-hidden">
            <div className="h-full bg-amber-700/80" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink/65">
            <div className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
              <p className="font-semibold text-ink/75">QC backlog</p>
              <p className="text-sm font-bold text-ink mt-1 leading-none">{team?.qcBacklog ?? 9}</p>
            </div>
            <div className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
              <p className="font-semibold text-ink/75">Open tasks</p>
              <p className="text-sm font-bold text-ink mt-1 leading-none">{team?.openTasks ?? 27}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldWidgets({ tasks, messages }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-2xl border border-ink/10 bg-white/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-ink">Your assigned tasks</h3>
          <Chip>{tasks.length} active</Chip>
        </div>
        <div className="mt-3 space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="rounded-2xl border border-ink/10 bg-parchment-100/40 p-3">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              <p className="text-[11px] text-ink/60 mt-0.5">Due: {t.due}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
        <h3 className="text-sm font-bold text-ink">Quick add</h3>
        <p className="text-xs text-ink/60 mt-1">Fast entry points for field work.</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <button type="button" className="rounded-xl border border-ink/20 bg-ink text-white px-4 py-2.5 text-sm font-semibold hover:bg-ink/90">
            + Artifact
          </button>
          <button type="button" className="rounded-xl border border-ink/15 bg-white/70 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-white">
            + Field report
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-ink">Recent messages</h4>
            <button type="button" className="text-xs font-semibold text-ink/70 hover:text-ink">Open</button>
          </div>
          <div className="mt-2 space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
                <p className="text-[11px] font-semibold text-ink">{m.from}</p>
                <p className="text-xs text-ink/70 mt-0.5 line-clamp-2">{m.text}</p>
                <p className="text-[10px] text-ink/50 mt-1">{m.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeamDashboard({ team, profile, onBack, onTeamUpdated, api }) {
  const { isDirector, isFieldArchaeologist } = useUserRole()
  const [section, setSection] = useState('overview')
  const [settingsTab, setSettingsTab] = useState('roles')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const effectiveApi = api || { inviteToTeam }

  // Live data for tasks/messages/members depends on your schema.
  // This dashboard now renders empty states instead of mock content until wired to your tables.
  const members = useMemo(() => [{ id: profile?.id || 'me', name: profile?.full_name || profile?.email || 'You' }], [profile])
  const fieldTasks = useMemo(() => [], [])
  const recentMessages = useMemo(() => [], [])

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 min-h-[70vh]">
      <aside className="md:w-72 shrink-0 rounded-3xl border border-ink/10 bg-white/60 backdrop-blur-sm p-3">
        <div className="flex items-start justify-between gap-3 px-2 pt-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink/60">Team</p>
            <h2 className="text-lg font-bold text-ink truncate">{team?.name || 'Team'}</h2>
            <p className="text-[11px] text-ink/55 mt-1 truncate">{team?.region || 'Unspecified region'}</p>
          </div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-ink/15 bg-white/70 px-3 py-2 text-xs font-semibold text-ink hover:bg-white shrink-0"
            >
              ← Back
            </button>
          ) : null}
        </div>

        <div className="mt-3 px-2 flex flex-wrap gap-2">
          <Chip>{isDirector ? 'Director' : isFieldArchaeologist ? 'Field Archaeologist' : 'Member'}</Chip>
          <Chip>{team?.activeDigSites ?? 0} sites</Chip>
          <Chip>{team?.memberCount ?? 0} members</Chip>
        </div>

        {/* Mobile: horizontal section nav. Desktop: vertical. */}
        <nav className="mt-4">
          <div className="md:hidden -mx-1 px-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={`shrink-0 px-3 py-2 rounded-2xl text-xs font-semibold border transition-colors ${
                    section === s.id ? 'bg-parchment-200/70 border-ink/15 text-ink' : 'bg-white/60 border-ink/10 text-ink/70 hover:text-ink hover:bg-white/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden md:block space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                  section === s.id ? 'bg-parchment-200/70 border border-ink/10 text-ink' : 'text-ink/70 hover:text-ink hover:bg-white/60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 space-y-4">
        {section === 'overview' && (
          <>
            {isDirector ? <DirectorWidgets team={team} /> : null}
            {isFieldArchaeologist ? <FieldWidgets tasks={fieldTasks} messages={recentMessages} /> : null}
          </>
        )}

        {section === 'digsites' && <EmptyPane title="Digsites" body="Digsite roster, permits, grid references, and daily logs would live here." />}
        {section === 'artifacts' && <EmptyPane title="Artifacts" body="Artifact intake, catalog fields, photos, and QA workflows would live here." />}
        {section === 'reports' && <EmptyPane title="Reports" body="Daily reports, trench summaries, lab notes, and exports would live here." />}
        {section === 'messages' && <EmptyPane title="Groups & Messages" body="Team channels, trench groups, and direct messages would live here." />}
        {section === 'posts' && <EmptyPane title="Posts" body="Announcements, pinned SOPs, and project updates would live here." />}
        {section === 'analytics' && <EmptyPane title="Analytics" body="Charts for throughput, backlog, and site activity would live here." />}
        {section === 'archives' && <EmptyPane title="Archives" body="Archived seasons, closed contexts, and long-term storage would live here." />}

        {section === 'settings' && (
          <div className="rounded-3xl border border-ink/10 bg-white/60 backdrop-blur-sm p-5">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-ink">Settings</h3>
                <p className="text-xs text-ink/60 mt-1">Directors can manage roles, permissions, and onboarding workflows.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsTab('roles')}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold border ${
                    settingsTab === 'roles' ? 'bg-ink text-white border-ink/30' : 'bg-white/70 text-ink border-ink/15 hover:bg-white'
                  }`}
                >
                  Roles
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('invites')}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold border ${
                    settingsTab === 'invites' ? 'bg-ink text-white border-ink/30' : 'bg-white/70 text-ink border-ink/15 hover:bg-white'
                  }`}
                >
                  Invitations
                </button>
              </div>
            </div>

            <div className="mt-5">
              {!isDirector ? (
                <EmptyPane title="Director only" body="You don’t have permission to manage roles or invitations for this team." />
              ) : settingsTab === 'roles' ? (
                <RoleManager team={team} members={members} />
              ) : (
                <div className="space-y-4">
                  {actionError ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                      <p className="text-xs font-semibold text-amber-900">{actionError}</p>
                    </div>
                  ) : null}
                  <InviteForm
                    teamName={team?.name}
                    onSubmit={async (values) => {
                      setActionLoading(true)
                      setActionError('')
                      try {
                        const userId = profile?.id
                        if (!userId) throw new Error('Missing user id')
                        await effectiveApi.inviteToTeam({
                          teamId: team?.id,
                          directorUserId: userId,
                          targetUser: values?.targetUser,
                          proposedRole: values?.proposedRole,
                          expectations: values?.expectations,
                        })
                        onTeamUpdated?.()
                      } catch (e) {
                        setActionError(e?.message || 'Failed to send invite')
                      } finally {
                        setActionLoading(false)
                      }
                    }}
                  />
                  {actionLoading ? <p className="text-xs text-ink/60">Sending…</p> : null}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

