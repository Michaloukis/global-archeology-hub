import React, { useMemo, useState } from 'react'
import { useUserRole } from '../../contexts/UserRoleContext'
import TeamCard from './TeamCard'
import ApplyForm from './ApplyForm'

function Modal({ title, open, onClose, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close modal overlay" />
      <div
        className={`relative w-full ${wide ? 'md:max-w-3xl' : 'md:max-w-xl'} bg-[#f8f3e8] rounded-t-3xl md:rounded-3xl border border-ink/15 shadow-[0_18px_70px_rgba(0,0,0,0.35)] max-h-[92vh] overflow-hidden`}
      >
        <div className="px-5 py-4 border-b border-ink/10 bg-white/55 backdrop-blur-sm flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-ink/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white"
          >
            Close
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function Fab({ label, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[1200] rounded-full shadow-[0_10px_30px_rgba(44,40,37,0.22)] border border-ink/15 bg-ink text-white px-5 py-3.5 text-sm font-semibold hover:bg-ink/90 focus:outline-none focus:ring-2 focus:ring-ink/30 inline-flex items-center gap-2"
    >
      <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  )
}

function IconPlus() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

export default function TeamsHub({ profile, teams, onOpenTeam, onCreateTeam }) {
  const { isDirector, isFieldArchaeologist } = useUserRole()
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [createName, setCreateName] = useState('')

  const [joinQuery, setJoinQuery] = useState('')
  const filteredTeams = useMemo(() => {
    const q = joinQuery.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => (t?.name || '').toLowerCase().includes(q) || (t?.region || '').toLowerCase().includes(q))
  }, [teams, joinQuery])

  const [applyTeam, setApplyTeam] = useState(null)

  return (
    <div className="relative">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-ink">Teams</h1>
          <p className="text-xs md:text-sm text-ink/60 mt-1">
            The Hub for collaboration, permissions, field tasks, and project progress.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-ink/60 bg-white/60 border border-ink/10 px-2 py-1 rounded-full">
            Museum-Modern · earth tones · slate accents
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(teams || []).map((team) => (
          <TeamCard key={team.id} team={team} onClick={() => onOpenTeam?.(team.id)} />
        ))}
      </div>

      {isDirector ? (
        <Fab
          label="Create New Team"
          onClick={() => setCreateOpen(true)}
          icon={<IconPlus />}
        />
      ) : null}
      {isFieldArchaeologist ? (
        <Fab
          label="Find & Join Teams"
          onClick={() => setJoinOpen(true)}
          icon={<IconSearch />}
        />
      ) : null}

      <Modal title="Create New Team" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink">Team name</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g., Valley Survey Unit"
              className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
            />
            <p className="text-[11px] text-ink/55 mt-1">This initializes a team shell (roles, permissions, dashboard).</p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-ink/15 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const name = createName.trim()
                if (!name) return
                onCreateTeam?.(name)
                setCreateName('')
                setCreateOpen(false)
              }}
              className="rounded-xl border border-ink/20 bg-ink text-white px-4 py-2.5 text-sm font-semibold hover:bg-ink/90"
            >
              Create team
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Find & Join Teams" open={joinOpen} onClose={() => { setJoinOpen(false); setApplyTeam(null) }} wide>
        {!applyTeam ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                value={joinQuery}
                onChange={(e) => setJoinQuery(e.target.value)}
                placeholder="Search teams by name or region…"
                className="flex-1 rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
              />
              <span className="text-xs font-semibold text-ink/60 bg-white/60 border border-ink/10 px-2 py-2.5 rounded-xl">
                {filteredTeams.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTeams.map((t) => (
                <div key={t.id} className="rounded-2xl border border-ink/10 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{t.name}</p>
                      <p className="text-xs text-ink/60 mt-1 line-clamp-2">{t.tagline}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-ink/70 bg-parchment-200/60 border border-ink/10 px-2 py-1 rounded-full shrink-0">
                      {t.memberCount} members
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-ink/60">{t.region}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenTeam?.(t.id)}
                        className="text-xs font-semibold text-ink/70 hover:text-ink rounded-lg px-2 py-1 hover:bg-parchment-100/60"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplyTeam(t)}
                        className="rounded-xl border border-ink/20 bg-ink text-white px-3 py-2 text-xs font-semibold hover:bg-ink/90"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ApplyForm
            teamName={applyTeam.name}
            initialValues={{ fullName: profile?.full_name || '', email: profile?.email || '' }}
            onCancel={() => setApplyTeam(null)}
            onSubmit={() => {
              setApplyTeam(null)
              setJoinOpen(false)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

