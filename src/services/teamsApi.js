import { supabase } from '../supabaseClient'

// If your database uses different table/column names, adjust these constants.
const TABLES = {
  teams: 'teams',
  teamMembers: 'team_members',
  teamApplications: 'team_applications',
  teamInvitations: 'team_invitations',
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase client not configured')
  return supabase
}

function unwrap(res) {
  if (res?.error) throw res.error
  return res?.data
}

export async function listTeamsForUser({ userId, isDirector }) {
  const sb = requireSupabase()

  if (isDirector) {
    // Common patterns: teams.director_id or teams.created_by
    const res = await sb
      .from(TABLES.teams)
      .select('*')
      .or(`director_id.eq.${userId},created_by.eq.${userId}`)
      .order('created_at', { ascending: false })
    return unwrap(res) || []
  }

  // Field archaeologist: via membership join
  const res = await sb
    .from(TABLES.teamMembers)
    .select(`team:${TABLES.teams}(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const rows = unwrap(res) || []
  return rows.map((r) => r.team).filter(Boolean)
}

export async function getTeamById(teamId) {
  const sb = requireSupabase()
  const res = await sb.from(TABLES.teams).select('*').eq('id', teamId).maybeSingle()
  return unwrap(res) || null
}

export async function searchTeams({ query, limit = 30 }) {
  const sb = requireSupabase()
  const q = String(query || '').trim()
  const base = sb.from(TABLES.teams).select('*').limit(limit).order('created_at', { ascending: false })
  const res = q ? await base.ilike('name', `%${q}%`) : await base
  return unwrap(res) || []
}

export async function createTeam({ name, directorUserId }) {
  const sb = requireSupabase()
  const res = await sb
    .from(TABLES.teams)
    .insert({
      name,
      director_id: directorUserId,
      created_by: directorUserId,
      visibility: 'active',
    })
    .select('*')
    .single()
  return unwrap(res)
}

export async function applyToTeam({ teamId, userId, payload }) {
  const sb = requireSupabase()
  const res = await sb
    .from(TABLES.teamApplications)
    .insert({
      team_id: teamId,
      user_id: userId,
      full_name: payload?.fullName || null,
      email: payload?.email || null,
      affiliation: payload?.affiliation || null,
      past_excavation_experience: payload?.experience || null,
      cover_letter: payload?.coverLetter || null,
      status: 'pending',
    })
    .select('*')
    .single()
  return unwrap(res)
}

export async function inviteToTeam({ teamId, directorUserId, targetUser, proposedRole, expectations }) {
  const sb = requireSupabase()
  const res = await sb
    .from(TABLES.teamInvitations)
    .insert({
      team_id: teamId,
      invited_by: directorUserId,
      target_user: targetUser,
      proposed_role: proposedRole,
      expectations_and_goals: expectations,
      status: 'pending',
    })
    .select('*')
    .single()
  return unwrap(res)
}

export async function publishDemoTeamsToDb({ profile, demoState }) {
  const sb = requireSupabase()
  const userId = profile?.id
  if (!userId) throw new Error('Missing user id')

  const teams = Array.isArray(demoState?.teams) ? demoState.teams : []
  if (teams.length === 0) return { createdTeams: 0 }

  // Ensure schema exists by performing a tiny query
  await sb.from(TABLES.teams).select('id').limit(1)

  const teamIdMap = new Map() // demoId -> dbId
  let createdTeams = 0

  for (const t of teams) {
    const payload = {
      name: t?.name || 'Untitled Team',
      region: t?.region || null,
      tagline: t?.tagline || null,
      visibility: t?.visibility || 'active',
      director_id: userId,
      created_by: userId,
    }

    const inserted = await sb.from(TABLES.teams).insert(payload).select('*').single()
    if (inserted.error) throw inserted.error
    const team = inserted.data
    createdTeams += 1
    teamIdMap.set(String(t.id), String(team.id))

    // Default roles + permissions (best-effort; ignore if tables missing)
    try {
      const roles = await sb
        .from('team_roles')
        .insert([
          { team_id: team.id, name: 'Director', is_system: true },
          { team_id: team.id, name: 'Field Archaeologist', is_system: true },
          { team_id: team.id, name: 'Trench Supervisor', is_system: false },
          { team_id: team.id, name: 'Finds Assistant', is_system: false },
        ])
        .select('*')
      if (!roles.error && Array.isArray(roles.data)) {
        const byName = Object.fromEntries(roles.data.map((r) => [String(r.name).toLowerCase(), r]))
        const permUpserts = []
        const directorRole = byName['director']
        const fieldRole = byName['field archaeologist']
        const trenchRole = byName['trench supervisor']
        const findsRole = byName['finds assistant']
        if (directorRole) permUpserts.push({ role_id: directorRole.id, can_edit_artifacts: true, can_post_reports: true, can_manage_tasks: true, can_moderate_messages: true })
        if (fieldRole) permUpserts.push({ role_id: fieldRole.id, can_edit_artifacts: true, can_post_reports: true, can_manage_tasks: false, can_moderate_messages: false })
        if (trenchRole) permUpserts.push({ role_id: trenchRole.id, can_edit_artifacts: true, can_post_reports: true, can_manage_tasks: true, can_moderate_messages: false })
        if (findsRole) permUpserts.push({ role_id: findsRole.id, can_edit_artifacts: true, can_post_reports: false, can_manage_tasks: false, can_moderate_messages: false })
        if (permUpserts.length) await sb.from('team_role_permissions').upsert(permUpserts, { onConflict: 'role_id' })
      }
    } catch (_) {}

    // Ensure membership for current user (director)
    try {
      await sb.from(TABLES.teamMembers).upsert({ team_id: team.id, user_id: userId }, { onConflict: 'team_id,user_id' })
    } catch (_) {}
  }

  // Publish invitations/applications (best-effort)
  try {
    const inv = Array.isArray(demoState?.invitations) ? demoState.invitations : []
    const rows = inv
      .map((x) => ({
        team_id: teamIdMap.get(String(x.team_id)),
        invited_by: userId,
        target_user: x.target_user,
        proposed_role: x.proposed_role,
        expectations_and_goals: x.expectations_and_goals,
        status: x.status || 'pending',
      }))
      .filter((x) => x.team_id && x.target_user && x.expectations_and_goals)
    if (rows.length) await sb.from(TABLES.teamInvitations).insert(rows)
  } catch (_) {}

  try {
    const apps = Array.isArray(demoState?.applications) ? demoState.applications : []
    const rows = apps
      .map((x) => ({
        team_id: teamIdMap.get(String(x.team_id)),
        user_id: userId,
        full_name: x.fullName || x.full_name || null,
        email: x.email || null,
        affiliation: x.affiliation || null,
        past_excavation_experience: x.experience || x.past_excavation_experience || null,
        cover_letter: x.coverLetter || x.cover_letter || null,
        status: x.status || 'pending',
      }))
      .filter((x) => x.team_id)
    if (rows.length) await sb.from(TABLES.teamApplications).insert(rows)
  } catch (_) {}

  return { createdTeams }
}

