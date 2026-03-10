-- Core Teams schema for Global Archaeology Hub
-- Run in Supabase Dashboard → SQL Editor (dev project)

-- Extensions commonly available in Supabase projects
create extension if not exists pgcrypto;

-- =============================================================================
-- teams
-- =============================================================================
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  tagline text,
  visibility text default 'active',
  director_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists teams_director_name_unique
  on public.teams (coalesce(director_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- =============================================================================
-- team_members
-- =============================================================================
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_id_idx on public.team_members(user_id);

-- =============================================================================
-- team_roles
-- =============================================================================
create table if not exists public.team_roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists team_roles_team_id_lower_name_unique
  on public.team_roles (team_id, lower(name));

-- =============================================================================
-- team_role_permissions
-- =============================================================================
create table if not exists public.team_role_permissions (
  role_id uuid primary key references public.team_roles(id) on delete cascade,
  can_edit_artifacts boolean not null default false,
  can_post_reports boolean not null default false,
  can_manage_tasks boolean not null default false,
  can_moderate_messages boolean not null default false
);

-- =============================================================================
-- team_tasks
-- =============================================================================
create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  assignee_type text not null default 'role', -- 'role' | 'member'
  assignee_id uuid,
  status text not null default 'open',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists team_tasks_team_id_idx on public.team_tasks(team_id);

-- =============================================================================
-- team_applications (Field Archaeologist -> apply)
-- =============================================================================
create table if not exists public.team_applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text,
  email text,
  affiliation text,
  past_excavation_experience text,
  cover_letter text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- =============================================================================
-- team_invitations (Director -> invite)
-- =============================================================================
create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  target_user text not null, -- email or user id string
  proposed_role text,
  expectations_and_goals text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- =============================================================================
-- RLS (dev-friendly baseline)
-- =============================================================================
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_roles enable row level security;
alter table public.team_role_permissions enable row level security;
alter table public.team_tasks enable row level security;
alter table public.team_applications enable row level security;
alter table public.team_invitations enable row level security;

-- Teams SELECT (non-recursive, dev-friendly)
-- IMPORTANT: Avoid referencing team_members here because team_members policies often reference teams,
-- which can cause "infinite recursion detected in policy for relation teams".
drop policy if exists "teams_select_member_or_director" on public.teams;
drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated"
on public.teams for select
to authenticated
using (true);

-- Teams: director/creator can insert/update
drop policy if exists "teams_insert_director" on public.teams;
create policy "teams_insert_director"
on public.teams for insert
to authenticated
with check (created_by = auth.uid() or director_id = auth.uid());

drop policy if exists "teams_update_director" on public.teams;
create policy "teams_update_director"
on public.teams for update
to authenticated
using (created_by = auth.uid() or director_id = auth.uid())
with check (created_by = auth.uid() or director_id = auth.uid());

-- team_members: view if same user or director of team
drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select"
on public.team_members for select
to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.teams t where t.id = team_members.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid()))
);

-- team_members: director can manage membership
drop policy if exists "team_members_insert_director" on public.team_members;
create policy "team_members_insert_director"
on public.team_members for insert
to authenticated
with check (
  exists (select 1 from public.teams t where t.id = team_members.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid()))
);

-- team_roles / permissions / tasks: director-only
drop policy if exists "team_roles_director_all" on public.team_roles;
create policy "team_roles_director_all"
on public.team_roles for all
to authenticated
using (exists (select 1 from public.teams t where t.id = team_roles.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid())))
with check (exists (select 1 from public.teams t where t.id = team_roles.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid())));

drop policy if exists "team_role_permissions_director_all" on public.team_role_permissions;
create policy "team_role_permissions_director_all"
on public.team_role_permissions for all
to authenticated
using (exists (
  select 1
  from public.team_roles r
  join public.teams t on t.id = r.team_id
  where r.id = team_role_permissions.role_id and (t.director_id = auth.uid() or t.created_by = auth.uid())
))
with check (exists (
  select 1
  from public.team_roles r
  join public.teams t on t.id = r.team_id
  where r.id = team_role_permissions.role_id and (t.director_id = auth.uid() or t.created_by = auth.uid())
));

drop policy if exists "team_tasks_select_member_or_director" on public.team_tasks;
create policy "team_tasks_select_member_or_director"
on public.team_tasks for select
to authenticated
using (
  exists (select 1 from public.teams t where t.id = team_tasks.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid()))
  or exists (select 1 from public.team_members m where m.team_id = team_tasks.team_id and m.user_id = auth.uid())
);

drop policy if exists "team_tasks_director_all" on public.team_tasks;
create policy "team_tasks_insert_director"
on public.team_tasks for insert
to authenticated
with check (
  exists (select 1 from public.teams t where t.id = team_tasks.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid()))
);

drop policy if exists "team_tasks_update_director" on public.team_tasks;
create policy "team_tasks_update_director"
on public.team_tasks for update
to authenticated
using (
  exists (select 1 from public.teams t where t.id = team_tasks.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid()))
)
with check (
  exists (select 1 from public.teams t where t.id = team_tasks.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid()))
);

drop policy if exists "team_tasks_delete_director" on public.team_tasks;
create policy "team_tasks_delete_director"
on public.team_tasks for delete
to authenticated
using (
  exists (select 1 from public.teams t where t.id = team_tasks.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid()))
);

-- applications: user can insert their own; director can select
drop policy if exists "team_applications_insert_self" on public.team_applications;
create policy "team_applications_insert_self"
on public.team_applications for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "team_applications_select_director" on public.team_applications;
create policy "team_applications_select_director"
on public.team_applications for select
to authenticated
using (exists (select 1 from public.teams t where t.id = team_applications.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid())));

-- invitations: director can insert/select
drop policy if exists "team_invitations_director_all" on public.team_invitations;
create policy "team_invitations_director_all"
on public.team_invitations for all
to authenticated
using (exists (select 1 from public.teams t where t.id = team_invitations.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid())))
with check (exists (select 1 from public.teams t where t.id = team_invitations.team_id and (t.director_id = auth.uid() or t.created_by = auth.uid())));

