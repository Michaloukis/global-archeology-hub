function nowIso() {
  return new Date().toISOString()
}

function uuidLike() {
  // Good enough for demo/local IDs (not a real UUID v4, but stable-format)
  const s = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
  return `${s()}${s()}-${s()}-${s()}-${s()}-${s()}${s()}${s()}`
}

const STORAGE_KEY = 'global-arch-demo-teams-v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_) {
    return null
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_) {}
}

export function clearDemoTeamsState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (_) {}
}

function getInitialState() {
  return {
    teams: [
      {
        id: 'atlas',
        name: 'Atlas Basin Survey',
        region: 'Morocco · High Atlas',
        tagline: 'Survey transects, rapid documentation, and site sampling.',
        visibility: 'active',
        created_at: nowIso(),
        memberCount: 12,
        activeDigSites: 3,
        pendingJoinRequests: 4,
        projectProgress: 61,
        reports7d: 11,
        artifacts7d: 29,
        qcBacklog: 7,
        openTasks: 24,
      },
      {
        id: 'valeriana',
        name: 'Valeriana Lidar Follow‑Up',
        region: 'Mexico · Campeche',
        tagline: 'Ground‑truthing lidar anomalies and mapping features.',
        visibility: 'active',
        created_at: nowIso(),
        memberCount: 18,
        activeDigSites: 5,
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
        visibility: 'active',
        created_at: nowIso(),
        memberCount: 9,
        activeDigSites: 2,
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
        visibility: 'active',
        created_at: nowIso(),
        memberCount: 15,
        activeDigSites: 4,
        pendingJoinRequests: 5,
        projectProgress: 57,
        reports7d: 13,
        artifacts7d: 36,
        qcBacklog: 10,
        openTasks: 28,
      },
    ],
    applications: [],
    invitations: [],
  }
}

function getState() {
  return load() || getInitialState()
}

export function getDemoTeamsState() {
  return getState()
}

export function ensureDemoTeamsState() {
  const existing = load()
  if (existing) return existing
  const init = getInitialState()
  save(init)
  return init
}

export function isMissingTeamsSchemaError(e) {
  const msg = String(e?.message || e || '')
  return msg.toLowerCase().includes('could not find the table') && msg.toLowerCase().includes('teams')
}

export async function listTeamsForUserDemo({ isDirector }) {
  const state = getState()
  // Directors see all demo teams; field archaeologists see a subset.
  return isDirector ? state.teams : state.teams.slice(0, 3)
}

export async function getTeamByIdDemo(teamId) {
  const state = getState()
  return state.teams.find((t) => String(t.id) === String(teamId)) || null
}

export async function searchTeamsDemo({ query }) {
  const state = getState()
  const q = String(query || '').trim().toLowerCase()
  if (!q) return state.teams
  return state.teams.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.region || '').toLowerCase().includes(q))
}

export async function createTeamDemo({ name }) {
  const state = getState()
  const team = {
    id: uuidLike(),
    name,
    region: 'Unspecified region',
    tagline: 'Newly initialized team.',
    visibility: 'active',
    created_at: nowIso(),
    memberCount: 1,
    activeDigSites: 0,
    pendingJoinRequests: 0,
    projectProgress: 0,
    reports7d: 0,
    artifacts7d: 0,
    qcBacklog: 0,
    openTasks: 0,
  }
  const next = { ...state, teams: [team, ...state.teams] }
  save(next)
  return team
}

export async function applyToTeamDemo({ teamId, userId, payload }) {
  const state = getState()
  const app = {
    id: uuidLike(),
    team_id: teamId,
    user_id: userId,
    ...payload,
    status: 'pending',
    created_at: nowIso(),
  }
  const next = { ...state, applications: [app, ...state.applications] }
  save(next)
  return app
}

export async function inviteToTeamDemo({ teamId, directorUserId, targetUser, proposedRole, expectations }) {
  const state = getState()
  const inv = {
    id: uuidLike(),
    team_id: teamId,
    invited_by: directorUserId,
    target_user: targetUser,
    proposed_role: proposedRole,
    expectations_and_goals: expectations,
    status: 'pending',
    created_at: nowIso(),
  }
  const next = { ...state, invitations: [inv, ...state.invitations] }
  save(next)
  return inv
}

