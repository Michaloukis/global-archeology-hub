# Global Archaeology Hub – Demo Script (Analytical)

One-page script for a repeatable 5–10 minute live demo. **Analytical design:** each section states purpose, dependencies, success criteria, and rationale so you can adapt or shorten the flow without losing coherence.

---

## 1. Project overview (opening: reason, purpose, scope)

**Reason for creation**  
Archaeology teams and students need one place to see dig sites, record field data, share 3D models and images, and collaborate—without scattering information across tools or losing control over who sees sensitive or student-only content.

**Purpose**  
The Global Archaeology Hub (GAH) is a **single webapp** that:

- Gives **everyone** a shared dashboard, global map of sites, team roster, and social/chat.
- Gives **Directors and Field Archeologists** an Arch Zone (field tools, site creation, 2D/3D artifact tools, journal uploads) and visibility over public vs student vs exclusive (Director-only) content.
- Gives **Students** a dedicated Edu Lab and access only to curriculum and student-visible sites.
- Gives **Enthusiasts** read-only access to public map and content.

**Scope (what’s in the webapp)**


| Area                 | What it is                                                                                                                            | Who sees it                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Home**             | Customizable dashboard: Mini Map, Quick Stats, Site Progress, Recent Field Logs, ArchBot (AI), Global Events, Social Activity, Teams. | All roles; widget set and layout persist per user.                    |
| **Map**              | Global dig sites (Leaflet); filters Public / Students (public+student) / Director only; site cards, journal links, virtual tours.     | All; Director sees exclusive layer when `created_by` = their user ID. |
| **Arch Zone**        | Field tools (notepad, compass, ceramic counter), Create site, 2D Illustrator, 3D Viewer, archives; links to Journal.                  | Director, Field Archeologist only.                                    |
| **Journal Terminal** | Per-site field records; upload images and 3D models (e.g. GLB); stored in Supabase.                                                   | Reached from Map or Arch Zone; archeologists + Director.              |
| **Archives**         | Central list of archive entries; open journal by site.                                                                                | Director, Field Archeologist.                                         |
| **Edu Lab**          | Student-only learning content and links to student-visible sites.                                                                     | Student only.                                                         |
| **Team**             | Team roster, roles, invitations (Director-managed).                                                                                   | All authenticated.                                                    |
| **Social**           | Chatrooms and community.                                                                                                              | Field Archeologist, Director, Student.                                |
| **Account**          | Profile, avatar, layout reset (restore default dashboard).                                                                            | All authenticated.                                                    |
| **Statistics**       | Route `/statistics` (analytics view).                                                                                                 | As implemented.                                                       |


**Roles:** Director (full access + exclusive map), Field Archeologist (Arch Zone + journal), Student (Edu Lab + student sites), Enthusiast (public map and content only).

Use this overview at the start so the audience knows *why* the project exists and *what* the webapp covers before you walk through each area.

---

## 2. Rubric mapping and “extra points” strategy

This section maps the app and the demo to the FLL-style rubric you shared (Greek labels): **ΠΡΟΣΔΙΟΡΙΣΜΟΣ, ΣΧΕΔΙΑΣΜΟΣ, ΔΗΜΙΟΥΡΓΙΑ, ΕΠΑΝΕΞΕΤΑΣΗ, ΕΠΙΚΟΙΝΩΝΙΑ**.  \nGoal: always cover the “επιτυχημένη/υποδειγματική” level **and** add 1–2 concrete “extras” per row so you reach the hidden 5th level that is not written on the sheet.

### 2.1 How the demo hits each criterion

| Rubric row (GR → EN) | What you must explicitly say/do during the demo | “Hidden 5th level” extras (pick 1–2 you can honestly claim) |
|----------------------|-----------------------------------------------|-------------------------------------------------------------|
| **ΠΡΟΣΔΙΟΡΙΣΜΟΣ – Problem definition** | In the opening, state a **clear, measurable** problem: scattered tools, lost context, roles mixed, no safe student space. Tie it to real users: Directors, Field Archeologists, Students, Enthusiasts. | Mention **research depth**: e.g. “We studied existing museum/archaeology tools and interviewed X archaeologists/teachers, and we saw the same pain: data and permissions scattered in spreadsheets, drives, and emails.” |
| **ΣΧΕΔΙΑΣΜΟΣ – Design** | When you show the **Home → Map → Arch Zone → Journal → Social/Team** flow, say that this was **not random**, but a **planned user journey** that mirrors a real excavation day. Mention that roles and visibility (public / student / Director-only) came from that plan. | Mention **trade-offs or alternatives** you considered and rejected: e.g. “We compared 3 map libraries and 2 ways of handling permissions before choosing the current architecture, because it scales better for many sites and roles.” |
| **ΔΗΜΙΟΥΡΓΙΑ – Creation** | While you show key features (widgets, Arch Zone tools, Journal uploads, Edu Lab), say that you **built working software**, not just mockups, and briefly name the technologies (React, Vite, Tailwind, Supabase, 2D/3D viewers). | Add at least one **technical stretch** element: e.g. “We connected real-time Supabase data so field records and 3D models are actually uploaded and reloaded live, not faked for the demo.” If true, also mention using **AI (ArchBot)** or your 3D pipeline as an innovation. |
| **ΕΠΑΝΕΞΕΤΑΣΗ – Re-examination / Iteration** | After Journal or Social, include 1–2 sentences about **iterations**: how early versions looked and what you changed after feedback. | Name concrete examples with numbers: e.g. “We ran 3 rounds of feedback with our coach/teacher and archeology mentors; we simplified the dashboard twice and added Site Progress after users said they were lost in the data.” Also mention at least one **thing you removed** because tests showed it was confusing. |
| **ΕΠΙΚΟΙΝΩΝΙΑ – Communication** | Throughout the demo, speak in **short, clear sentences** and connect each screen back to the central story: one hub for discovery, field work, education, and collaboration. End with a recap sentence. | Add an **external audience** and a **communication artifact**: e.g. “We created a short guide for students and presented the platform to our school/club, collected their comments, and used them to adjust the Edu Lab and Social areas.” Also mention if you created any posters, videos, or documentation aimed at non-technical people. |

### 2.2 Phrases to sneak in for maximum score

You can weave these 1‑sentence “extras” into your script at natural points:

- **Problem (ΠΡΟΣΔΙΟΡΙΣΜΟΣ)** – “Πριν γράψουμε γραμμή κώδικα, καταγράψαμε τα πραγματικά προβλήματα των αρχαιολόγων και των μαθητών: χαμένα δεδομένα, μπερδεμένοι ρόλοι, και καμία ενιαία εικόνα των ανασκαφών.”  
- **Design (ΣΧΕΔΙΑΣΜΟΣ)** – “Σχεδιάσαμε τη ροή Home → Map → Arch Zone → Journal ώστε να ακολουθεί ακριβώς μια μέρα σε ανασκαφή, από τον προγραμματισμό μέχρι την τελική καταγραφή.”  
- **Creation (ΔΗΜΙΟΥΡΓΙΑ)** – “Χτίσαμε ένα πραγματικό webapp με React και Supabase, με ζωντανό χάρτη και αποθήκευση εικόνων/3D μοντέλων, όχι απλώς διαφάνειες.”  
- **Re-examination (ΕΠΑΝΕΞΕΤΑΣΗ)** – “Κάναμε αρκετούς κύκλους επανεξέτασης: μετά από κάθε δοκιμή με μέντορες αλλάξαμε τη διάταξη των widgets και απλοποιήσαμε φόρμες που μπέρδευαν τους χρήστες.”  
- **Communication (ΕΠΙΚΟΙΝΩΝΙΑ)** – “Δοκιμάσαμε την παρουσίαση με ανθρώπους που δεν ξέρουν προγραμματισμό, φτιάξαμε μικρό οδηγό χρήσης, και προσαρμόσαμε τη γλώσσα μας για να είναι κατανοητή σε όλους.”

Pick 3–5 of these lines that are true for your team and place them where they feel natural. That is what usually pushes teams into the **unwritten ‘fifth’ level**: clear problem, solid design, working solution, iterative improvement, and proof that you have already started communicating beyond the judging table.

---

## 3. Pre-flight (before presenting)

**Objective:** Minimize live failures. Verify in this order; if a step fails, fix or use the fallback before starting.


| #   | Check                         | Verification                                                                                                                                 | Fallback if failed                                                                                                                             |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Env**                       | `.env` exists (from `.env.example`) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Optional: `VITE_GROQ_API_KEY` for ArchBot.        | No Supabase → "Database connection lost"; describe flow with simulated data. No Groq → ArchBot UI only; say "AI can be connected via API key." |
| 2   | **Run app**                   | `npm install` then `npm run dev`. App at [http://localhost:5173](http://localhost:5173).                                                     | Use pre-recorded capture or static walkthrough.                                                                                                |
| 3   | **Browser**                   | One tab on the app; stable zoom/font so sidebar and widgets are readable on projector.                                                       | Reduce zoom or skip widget detail.                                                                                                             |
| 4   | **Test login**                | Confirm Director or Field Archeologist account works; Arch Zone visible in nav.                                                              | Use backup account (e.g. Student) and emphasize Map + Edu Lab.                                                                                 |
| 5   | **Sites on map**              | Run `add-coordinates.sql` and `seed-public-student-exclusive.sql` in Supabase so map has sites.                                              | Skip to "pre-seeded sites" talking point; avoid creating sites live.                                                                           |
| 6   | **Exclusive site (Director)** | In Supabase, set site "Valley of the Kings (Chief)" so `created_by` = your logged-in Director user ID (see `supabase-migrations/README.md`). | Omit "Director only" filter; show Public + Student filters only.                                                                               |
| 7   | **Journal upload**            | Bucket `field-records` is Public; `site_journals.model_url` exists.                                                                          | Skip upload; describe the flow verbally.                                                                                                       |


---

## 4. Order of steps (with success criteria)

Execute in sequence. Each step has a **success criterion** and an optional **short-path** note.


| Step                           | Action                                                                                                                                                                 | Success criterion                                       | Short path                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| **1. Login**                   | Use Director or Field Archeologist.                                                                                                                                    | Arch Zone appears in sidebar/nav.                       | Required.                                  |
| **2. Home dashboard**          | Show widgets: Mini Map, Quick Stats, Site Progress, Recent Field Logs, ArchBot, Global Events, Social Activity, Teams. Click "Customize widgets" to add/remove/resize. | At least two widgets visible; customize panel opens.    | Show one widget + "Customize widgets."     |
| **3. Map**                     | Open "Map" from nav. Show sites (public/student/Director-only if Director). Use filters (e.g. "Students (public + student)"). Click a site for Journal or details.     | Sites render; filter changes list; one site card opens. | Sites visible; one click on site.          |
| **4. Arch Zone**               | Show tools: notepad, compass, ceramic counter, "Create site" form. Open **2D Illustrator** (`/illustrator-2d`) and **3D Viewer** (`/viewer-3d`).                       | At least one tool + one of 2D/3D pages load.            | One tool + 2D or 3D only.                  |
| **5. Journal Terminal**        | From Map or Arch Zone, pick a site and open its journal. Demo uploading an image or 3D model.                                                                          | Journal opens for site; upload starts (or completes).   | Open journal; describe upload if it fails. |
| **6. Role switch (optional)**  | Log out, sign in as Student. Show Edu Lab; confirm no Arch Zone; map shows only student-visible sites.                                                                 | Edu Lab visible; Arch Zone absent; map filtered.        | Omit if under time pressure.               |
| **7. Social / Team / Account** | Quick pass: Team list, Social (chatrooms), Account (profile, avatar, "Restore default layout").                                                                        | Each section opens without error.                       | One of the three.                          |


**Short demo (time pressure):** Login → Home (widgets) → Map (sites) → Arch Zone (one tool + 2D or 3D) → Journal (one upload).

---

## 5. Talking points (1 line per step)


| Step                      | Talking point                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1 Login                   | Role-based access: Directors and Field Archeologists get the full Arch Zone.                                                     |
| 2 Home                    | Dashboard is customizable: drag, resize, and choose which widgets to show; ArchBot uses AI when Groq is configured.              |
| 3 Map                     | Sites can be public, student-only, or exclusive to the Director; filters and site cards link to journals and virtual tours.      |
| 4 Arch Zone               | Field tools for notes, compass, ceramic counting; create sites with visibility; 2D find illustrator and 3D viewer for artifacts. |
| 5 Journal                 | Per-site field records; images and 3D models (e.g. GLB) are stored in Supabase for the team.                                     |
| 6 Role switch             | Students see Edu Lab and student-visible sites; they don’t see Arch Zone or private Director content.                            |
| 7 Social / Team / Account | Team roster, chatrooms for collaboration, and account settings including profile and layout reset.                               |


---

## 6. If something breaks (symptom → cause → action)

Use this table to diagnose and recover during the demo. Apply the first matching row; if unresolved, use the fallback in the last column.


| Symptom                        | Likely cause                                                                 | Action                                                                                                        | Fallback                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Database connection lost**   | Wrong or missing `.env` (Supabase URL/anon key).                             | Check `.env`, refresh. Have a backup account ready.                                                           | Describe flow with "simulated data"; use pre-recorded capture.                                               |
| **No sites on map**            | Migrations not run or seed not applied.                                      | Run `add-coordinates.sql` and `seed-public-student-exclusive.sql` in Supabase.                                | Skip to "pre-seeded sites" talking point; do not create sites live.                                          |
| **Journal upload fails**       | Bucket `field-records` not Public or `site_journals.model_url` missing.      | Ensure bucket is Public; add `model_url` column to `site_journals`.                                           | Skip upload; describe the flow.                                                                              |
| **ArchBot not answering**      | No `VITE_GROQ_API_KEY`.                                                      | Expected without Groq key.                                                                                    | Show the UI; say "AI can be connected via API key."                                                          |
| **Exclusive site not visible** | Site "Valley of the Kings (Chief)" has `created_by` ≠ logged-in Director ID. | In Supabase: `UPDATE sites SET created_by = 'YOUR_DIRECTOR_UUID' WHERE name = 'Valley of the Kings (Chief)';` | Omit Director-only filter; show Public + Student only.                                                       |
| **Offline / Supabase down**    | Network or Supabase outage.                                                  | —                                                                                                             | Use pre-recorded screen capture (Home → Map → Arch Zone → Journal) or present UI/flow with "simulated data." |


**Quick fallbacks:** Switch to backup account (e.g. Student) or skip to Map and show pre-seeded sites.

---

## 7. Reference: key routes and widgets

- **Routes:** Home (default), Map, Arch Zone, Education (Edu Lab), Archives, Journal (requires `siteId`), Account, Team, Social, `/illustrator-2d`, `/viewer-3d`, `/statistics`, `/teams` (redirects to Team).
- **Default dashboard widgets:** `minimap`, `quickstats`, `site-progress`, `recent-logs`, `archbot`, `global-events`, `social-activity`, `teams`.
- **Visibility:** Public sites (`is_public = true`); student-visible (public + student); Director-only when `created_by` = Director’s user ID and filter "Director only" is selected.

