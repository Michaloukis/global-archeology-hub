-- Store Google OAuth tokens per user for Calendar API access.
-- Used by Edge Functions only; RLS ensures users only see their own row.

create table if not exists public.user_google_calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_google_calendar_tokens enable row level security;

create policy "Users can read own google calendar tokens"
  on public.user_google_calendar_tokens for select
  using (auth.uid() = user_id);

create policy "Users can delete own google calendar tokens"
  on public.user_google_calendar_tokens for delete
  using (auth.uid() = user_id);

-- Insert/update only via service role (Edge Functions) after OAuth callback.

comment on table public.user_google_calendar_tokens is 'Google OAuth tokens for Calendar API; used by Edge Functions for sync.';
