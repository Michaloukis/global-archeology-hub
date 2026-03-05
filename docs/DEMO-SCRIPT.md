# Global Archaeology Hub – Demo Script

One-page script for a repeatable 5–10 minute live demo. Use with the [Demo Presentation Prep](..) checklist (env, Supabase, migrations, test accounts).

---

## Project overview (opening: reason, purpose, scope)

**Reason for creation**  
Archaeology teams and students need one place to see dig sites, record field data, share 3D models and images, and collaborate—without scattering information across tools or losing control over who sees sensitive or student-only content.

**Purpose**  
The Global Archaeology Hub (GAH) is a **single webapp** that:

- Gives **everyone** a shared dashboard, global map of sites, team roster, and social/chat.
- Gives **Chief and Field Archeologists** an Arch Zone (field tools, site creation, 2D/3D artifact tools, journal uploads) and visibility over public vs student vs exclusive (Chief-only) content.
- Gives **Students** a dedicated Edu Lab and access only to curriculum and student-visible sites.
- Gives **Enthusiasts** read-only access to public map and content.

So the **purpose** is: one platform for discovery, field work, education, and collaboration, with role-based access and clear separation of public, student, and exclusive data.

**Whole-project scope (what’s in the webapp)**

| Area | What it is |
|------|------------|
| **Home** | Customizable dashboard: mini map, quick stats, ArchBot (AI), latest reports, global events. |
| **Map** | Global dig sites (Leaflet); filters for public / student / exclusive; site cards, journal links, virtual tours. |
| **Arch Zone** | Field tools (notepad, compass, ceramic counter), create site, 2D Illustrator, 3D Viewer, archives; for Chiefs and Field Archeologists only. |
| **Journal Terminal** | Per-site field records; upload images and 3D models (e.g. GLB); stored in Supabase. |
| **Edu Lab** | Student-only learning content and links to student-visible sites. |
| **Team** | Team roster and collaboration. |
| **Social** | Chatrooms and community. |
| **Account** | Profile, avatar, layout reset. |

**Roles:** Chief Archeologist (full access + exclusive map), Field Archeologist (Arch Zone + journal), Student (Edu Lab + student sites), Enthusiast (public map and content only).

Use this overview at the start of the demo so the audience knows *why* the project exists and *what* the whole webapp covers before you walk through each area.

---

## Pre-flight (before presenting)

- [ ] **Env**: `.env` exists (from `.env.example`) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Optional: `VITE_GROQ_API_KEY` for ArchBot.
- [ ] **Run app**: `npm install` then `npm run dev`. App at http://localhost:5173.
- [ ] **Browser**: One tab on the app; stable zoom/font so sidebar and widgets are readable on projector.
- [ ] **Test login**: Confirm Chief or Field Archeologist account works (Arch Zone visible).

---

## Order of steps

1. **Login** — Use Chief or Field Archeologist so Arch Zone is visible.
2. **Home dashboard** — Show widgets (Mini Map, Quick Stats, ArchBot, Global Events). Click “Customize widgets” to add/remove/resize.
3. **Map** — Open “Map” from nav. Show sites (public/student/exclusive if Chief). Use filters (e.g. “Students (public + student)”). Click a site for Journal or details.
4. **Arch Zone** — Show tools: notepad, compass, ceramic counter, “Create site” form. Open **2D Illustrator** (`/illustrator-2d`) and **3D Viewer** (`/viewer-3d`).
5. **Journal Terminal** — From map, pick a site and open its journal; demo uploading an image or 3D model.
6. **Role switch (optional)** — Log out, sign in as Student; show Edu Lab, no Arch Zone; map with student-visible sites only.
7. **Social / Team / Account** — Quick pass: Team list, Social (chatrooms), Account (profile, avatar, restore default layout).

**Short demo (time pressure):** Login → Home (widgets) → Map (sites) → Arch Zone (one tool + 2D/3D) → Journal (one upload).

---

## Talking points (1 line per step)

| Step | Talking point |
|------|----------------|
| 1 Login | Role-based access: Chiefs and Field Archeologists get the full Arch Zone. |
| 2 Home | Dashboard is customizable: drag, resize, and choose which widgets to show; ArchBot uses AI when Groq is configured. |
| 3 Map | Sites can be public, student-only, or exclusive to the Chief; filters and site cards link to journals and virtual tours. |
| 4 Arch Zone | Field tools for notes, compass, ceramic counting; create sites with visibility; 2D find illustrator and 3D viewer for artifacts. |
| 5 Journal | Per-site field records; images and 3D models (e.g. GLB) are stored in Supabase for the team. |
| 6 Role switch | Students see Edu Lab and student-visible sites; they don’t see Arch Zone or private Chief content. |
| 7 Social / Team / Account | Team roster, chatrooms for collaboration, and account settings including profile and layout reset. |

---

## If something breaks

- **Database connection lost** — Check `.env` (Supabase URL/anon key), refresh. Have a backup account ready.
- **No sites on map** — Run `add-coordinates.sql` and `seed-public-student-exclusive.sql` in Supabase; skip to “pre-seeded sites” talking point.
- **Journal upload fails** — Ensure `field-records` bucket is Public and `site_journals.model_url` exists; skip upload and describe the flow.
- **ArchBot not answering** — Expected without Groq key; show the UI and say “AI can be connected via API key.”
- **Exclusive site not visible** — In Supabase, set the site “Valley of the Kings (Chief)” so `created_by` = your logged-in Chief user ID (see `supabase-migrations/README.md`).
- **Offline / Supabase down** — Use a short pre-recorded screen capture (Home → Map → Arch Zone → Journal) or present UI/flow with “simulated data.”

**Quick fallbacks:** Switch to backup account (e.g. Student) or skip to Map and show pre-seeded sites.
