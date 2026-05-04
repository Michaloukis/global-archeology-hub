# Global Archaeology Hub

Role-based archaeology hub for **field documentation**, **mapping**, and **collaboration**, built for professionals, students, and enthusiasts.

## Project goal

**Give archaeology teams and learners one coherent digital workspace**—from discovery on a map to daily field notes, media, and team coordination—so heritage work is **documented consistently**, **shared with the right audience** (public vs. restricted), and **accessible** without chaining together half a dozen unrelated apps. The long-term aim is to support **digital preservation** and education: professionals operate efficiently in the field; students and enthusiasts learn and contribute within clear boundaries.

## Purpose of the web app

### Problems this addresses

- **Fragmented tooling**: maps in one place, photos and 3D elsewhere, chat in another—nothing ties a site to its journal, team, and reporting workflow.
- **Unequal access**: professionals need expedition workflows and approvals; students and the public need discovery and learning—not the same UI or data scope.
- **Sensitivity of place**: some dig locations must stay **exclusive** to authorized roles; others can be **public** or **student-visible**. The app models that split instead of treating every pin as global.

### What you get (specific capabilities)

| Area | What it does |
|------|----------------|
| **Home dashboard** | Role-aware, configurable widgets: mini map, quick stats, site progress, recent field logs, **ArchBot**, calendar, global events, social activity, teams—and for students, courses and notepad-focused layouts. |
| **Map** | Browse sites with filters aligned to visibility (**public**, student-facing, **exclusive** sites for Chiefs/Directors). Open a site to jump into its context. |
| **Journal terminal** | Per-site **field records**: notes, findings, **photos**, and **3D models** (e.g. GLB/GLTF/OBJ and common formats) stored via Supabase Storage—one trail per excavation instead of scattered files. |
| **Arch Zone** | Operations hub for **Directors** and **field archaeologists**: expedition **inbox** (approve/reject field requests), **register new dig sites** with coordinates and visibility, **archives** of recent journals, **professional tools** (field notepad, compass, ceramic-count sessions with optional GPS pins, **2D illustration**, **3D viewer/scanner flows**, report templates), plus shortcuts to **analytics** and **calendar**. |
| **Edu Lab** | **Student** role: learning-oriented dashboard and Edu Lab entry—content and tools tuned for study, not full expedition control. |
| **Teams & Social** | **Teams** with roles and invites; **Social Hub** with chatrooms tied to communities and sites—coordination without leaving the hub. |
| **ArchBot (optional)** | AI assistant whose behavior is meant to align with **role** (e.g. strategic summaries vs. tutor-style help) when `VITE_GROQ_API_KEY` is set. |
| **Calendar** | Events and optional links (e.g. “Add to Google” patterns); migrations support richer calendar sync where configured. |

### Roles at a glance

- **Director (“Chief”)**: exclusive map, site creation, expedition approvals, team leadership.
- **Field archaeologist**: assigned expeditions, journals, Arch Zone tools.
- **Student**: Edu Lab, student-safe map content, learning-focused dashboard.
- **Public**: discovery and participation within what admins mark as public.

Security and visibility are enforced in production by **Supabase Auth**, **Row Level Security**, and **site-level flags** (e.g. `is_public`, visibility tiers)—the UI reflects intent; always validate policies on the database.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![CodeQL](../../actions/workflows/codeql.yml/badge.svg)](../../actions/workflows/codeql.yml)

For the competition demo flow, see [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md).

## What’s in this repo

- **Web app**: Vite + React (repo root)
- **Mobile app**: Expo / React Native in [`mobile/`](mobile/)
- **Backend**: Supabase (schema/migrations in [`supabase/`](supabase/))

## Tech stack

- **Frontend**: React, Vite, Tailwind
- **Maps**: Leaflet / React Leaflet
- **3D**: Three.js / React Three Fiber
- **Backend**: Supabase (Postgres + Auth + Storage + RLS)
- **Optional AI**: Groq API (used by the in-app assistant)

## Quickstart (web)

### 1) Install

```bash
npm ci
```

### 2) Configure environment

Create a local `.env` from the template:

```bash
cp .env.example .env
```

Required:
- **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (Supabase project settings)

Optional:
- **`VITE_GROQ_API_KEY`** (Groq Console: https://console.groq.com)

Security note: **never commit** `.env` files or real keys.

### 3) Run

```bash
npm run dev
```

App runs at `http://localhost:5173`.

### Build / preview

```bash
npm run build
npm run preview
```

## Quickstart (mobile)

See [`mobile/README.md`](mobile/README.md) (Expo). CI builds for the native app can be configured via [`codemagic.yaml`](codemagic.yaml).

## Supabase: Field records (images & 3D models)

For archeologists’ field records (Journal Terminal), the app uploads **images** and **3D models** to Supabase Storage.

1. **Storage bucket**  
   In Supabase Dashboard → Storage, create a bucket named **`field-records`** and set it to **Public** (so the app can use public URLs for uploaded files).

2. **`site_journals.model_url` column**  
   In Supabase Dashboard → Table Editor → `site_journals`, add a column:
   - Name: **`model_url`**
   - Type: **text**
   - Nullable: yes  

   Or run in SQL Editor:
   ```sql
   ALTER TABLE site_journals ADD COLUMN IF NOT EXISTS model_url text;
   ```

3. **Artifact / find location (optional)**  
   So journal entries can have coordinates and show on the Exclusive Map:
   ```sql
   ALTER TABLE site_journals ADD COLUMN IF NOT EXISTS lat double precision;
   ALTER TABLE site_journals ADD COLUMN IF NOT EXISTS lng double precision;
   ```

4. **Sites on the map (location for dig sites)**  
   Ensure `sites` has `lat`/`lng` and fill existing dig sites so they show on the map:
   ```sql
   ALTER TABLE sites ADD COLUMN IF NOT EXISTS lat double precision;
   ALTER TABLE sites ADD COLUMN IF NOT EXISTS lng double precision;
   UPDATE sites SET lat = 20 + (random() * 40 - 10), lng = (random() * 360 - 180) WHERE lat IS NULL OR lng IS NULL;
   ```
   Or run the full `supabase-migrations/add-coordinates.sql` file (adds columns + fills sites + journal lat/lng).

5. **Public vs Student vs Exclusive Map**  
   So some sites are visible to everyone and others only to the Chief on the Exclusive Map:
   ```sql
   ALTER TABLE sites ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
   UPDATE sites SET is_public = true WHERE is_public IS NULL;
   ```
   - **Public** (`is_public = true`): visible to everyone (Students, Enthusiasts, and on the map for all).
   - **Private** (`is_public = false`): visible only when that Chief is logged in (Exclusive Map). When creating a site as Chief, uncheck “Public site” to choose "Private (Exclusive Map only)". Use filter "Students (public + student)" for student-visible sites. Run `supabase-migrations/seed-public-student-exclusive.sql` for example sites and artifacts.

Supported **image** types: JPEG, PNG, GIF, WebP.  
Supported **3D model** types: GLB, GLTF, OBJ, FBX, STL, DAE, 3DS, PLY.

## Admin scripts (server-side only)

This repo contains scripts that require the **Supabase service role key** (admin privileges).

Example: `scripts/seed-teams.mjs` reads:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do **not** expose these values in client apps and do **not** commit them.

## Security & safety (project stance)

- **Secrets hygiene**: keys live in local `.env` or CI secret stores; `.env` is ignored by git.
- **Role-based visibility**: the app distinguishes public vs restricted content (e.g., “Exclusive Map” vs public sites).
- **Supabase RLS**: data access is intended to be enforced with Row Level Security policies server-side.

If you find a vulnerability, please follow [`SECURITY.md`](SECURITY.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Apache-2.0. See [`LICENSE`](LICENSE).

