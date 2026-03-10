import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/s$/, '')
}

async function must(res, label) {
  if (res.error) {
    const msg = `[${label}] ${res.error.message}`
    throw new Error(msg)
  }
  return res.data
}

async function getProfilesByRole(targetRole) {
  const r = normalizeRole(targetRole)
  const { data, error } = await supabase.from('profiles').select('id, role, full_name, email, username').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).filter((p) => normalizeRole(p.role) === r)
}

async function ensureTeam({ name, directorId, region, tagline }) {
  const existing = await must(
    supabase.from('teams').select('*').eq('director_id', directorId).ilike('name', name).maybeSingle(),
    'teams.select',
  )
  if (existing) return existing

  return await must(
    supabase
      .from('teams')
      .insert({
        name,
        director_id: directorId,
        created_by: directorId,
        region,
        tagline,
        visibility: 'active',
      })
      .select('*')
      .single(),
    'teams.insert',
  )
}

async function ensureRole({ teamId, name, isSystem, permissions }) {
  const existing = await must(
    supabase.from('team_roles').select('*').eq('team_id', teamId).ilike('name', name).maybeSingle(),
    'team_roles.select',
  )
  const role = existing
    ? existing
    : await must(
        supabase
          .from('team_roles')
          .insert({ team_id: teamId, name, is_system: !!isSystem })
          .select('*')
          .single(),
        'team_roles.insert',
      )

  if (permissions) {
    await must(
      supabase.from('team_role_permissions').upsert(
        {
          role_id: role.id,
          can_edit_artifacts: !!permissions.can_edit_artifacts,
          can_post_reports: !!permissions.can_post_reports,
          can_manage_tasks: !!permissions.can_manage_tasks,
          can_moderate_messages: !!permissions.can_moderate_messages,
        },
        { onConflict: 'role_id' },
      ),
      'team_role_permissions.upsert',
    )
  }

  return role
}

async function ensureMember({ teamId, userId, roleId }) {
  await must(
    supabase.from('team_members').upsert({ team_id: teamId, user_id: userId, role_id: roleId }, { onConflict: 'team_id,user_id' }),
    'team_members.upsert',
  )
}

function pickSome(arr, n, offset = 0) {
  const out = []
  for (let i = 0; i < n; i++) {
    const idx = (offset + i) % (arr.length || 1)
    if (arr[idx]) out.push(arr[idx])
  }
  return out
}

async function main() {
  console.log('Loading profiles…')
  const directors = await getProfilesByRole('Director')
  const field = await getProfilesByRole('Field Archaeologist')

  if (directors.length === 0) throw new Error('No Director profiles found (profiles.role = "Director").')
  if (field.length === 0) throw new Error('No Field Archaeologist profiles found (profiles.role = "Field Archaeologist").')

  console.log(`Found ${directors.length} director(s), ${field.length} field archaeologist(s).`)

  const teamTemplates = [
    { name: 'Atlas Basin Survey', region: 'Morocco · High Atlas', tagline: 'Survey transects, rapid documentation, and site sampling.' },
    { name: 'Valeriana Lidar Follow‑Up', region: 'Mexico · Campeche', tagline: 'Ground‑truthing lidar anomalies and mapping features.' },
    { name: 'Papoura Hilltop Team', region: 'Greece · Crete', tagline: 'Monumental structure excavation and materials analysis.' },
    { name: 'Pompeii Fresco Unit', region: 'Italy · Campania', tagline: 'Conservation-first documentation and finds processing.' },
  ]

  for (let d = 0; d < directors.length; d++) {
    const director = directors[d]
    const myTeams = pickSome(teamTemplates, Math.min(2, teamTemplates.length), d * 2)

    for (const tt of myTeams) {
      console.log(`Seeding team "${tt.name}" for director ${director.email || director.full_name || director.id}…`)
      const team = await ensureTeam({ name: tt.name, directorId: director.id, region: tt.region, tagline: tt.tagline })

      const roleDirector = await ensureRole({
        teamId: team.id,
        name: 'Director',
        isSystem: true,
        permissions: { can_edit_artifacts: true, can_post_reports: true, can_manage_tasks: true, can_moderate_messages: true },
      })
      const roleField = await ensureRole({
        teamId: team.id,
        name: 'Field Archaeologist',
        isSystem: true,
        permissions: { can_edit_artifacts: true, can_post_reports: true, can_manage_tasks: false, can_moderate_messages: false },
      })
      const roleTrench = await ensureRole({
        teamId: team.id,
        name: 'Trench Supervisor',
        isSystem: false,
        permissions: { can_edit_artifacts: true, can_post_reports: true, can_manage_tasks: true, can_moderate_messages: false },
      })
      const roleFinds = await ensureRole({
        teamId: team.id,
        name: 'Finds Assistant',
        isSystem: false,
        permissions: { can_edit_artifacts: true, can_post_reports: false, can_manage_tasks: false, can_moderate_messages: false },
      })

      // Director membership
      await ensureMember({ teamId: team.id, userId: director.id, roleId: roleDirector.id })

      // Add some field archaeologists
      const addCount = Math.min(4, field.length)
      const selected = pickSome(field, addCount, d * 3)
      for (let i = 0; i < selected.length; i++) {
        const user = selected[i]
        const role = i === 0 ? roleTrench : i === 1 ? roleFinds : roleField
        await ensureMember({ teamId: team.id, userId: user.id, roleId: role.id })
      }
    }
  }

  console.log('Done. Teams, roles, and memberships seeded.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

