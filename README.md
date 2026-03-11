# Gah Web App

A modern web application built with React, Vite, and Tailwind CSS.

## Features

- ⚡ Fast development with Vite
- ⚛️ React 18 with modern hooks
- 🎨 Beautiful UI with Tailwind CSS
- 📱 Responsive design
- ✨ Interactive components (Counter, Task Manager)

## Getting Started

### Environment

Copy `.env.example` to `.env` and set:

- **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** — required (from Supabase project settings). Without these, the app shows "Database connection lost."
- **`VITE_GROQ_API_KEY`** — optional; used for the in-app AI Assistant (ArchBot). Get a key at [Groq Console](https://console.groq.com).

Do not commit `.env` or real keys.

For a **demo presentation**, see [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) for pre-flight, step-by-step flow, and fallbacks.

### Install Dependencies

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Create a production build:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

## Mobile app (Android / iOS)

The **native app** lives in **`mobile/`** (Expo / React Native). Builds are run with **[Codemagic](https://codemagic.io)** using the root **`codemagic.yaml`**.

- Add the repo in Codemagic and run the **Android (APK)** or **iOS (IPA)** workflow to get installable artifacts.
- See **[mobile/README.md](mobile/README.md)** for running locally, SDK setup, and signing options.

## Project Structure

```
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles with Tailwind
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Project dependencies
```

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

## Customization

Feel free to customize this app to build your own features! The current implementation includes:

- Interactive counter component
- Task manager with add/complete/delete functionality
- Modern, responsive UI design

Happy coding! 🚀

