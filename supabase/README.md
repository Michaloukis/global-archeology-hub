# Supabase setup

## Calendar events table

To persist calendar events in the database, run the migration:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Copy the contents of `migrations/20250315000000_create_calendar_events.sql`.
3. Run the script.

This creates the `calendar_events` table and RLS policies so each user only sees and edits their own events.

## Add to Google Calendar

The calendar offers an **“Add to Google”** link on each event. It opens Google Calendar in a new tab with the event pre-filled (title, date, time, location, description). No OAuth or backend setup required.
