-- Calendar events: user-owned events for the hub calendar.
-- Run this in the Supabase SQL editor if you don't use the CLI.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  location text,
  description text,
  time text,
  event_type text not null default 'other' check (event_type in ('meeting', 'fieldwork', 'seminar', 'deadline', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_user_id on public.calendar_events(user_id);
create index if not exists idx_calendar_events_date on public.calendar_events(date);

alter table public.calendar_events enable row level security;

create policy "Users can read own calendar events"
  on public.calendar_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own calendar events"
  on public.calendar_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own calendar events"
  on public.calendar_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own calendar events"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

comment on table public.calendar_events is 'User-created calendar events for the Global Archaeology Hub calendar.';
