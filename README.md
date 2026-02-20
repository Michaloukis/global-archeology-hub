# Gah Web App

A modern web application built with React, Vite, and Tailwind CSS.

## Features

- ⚡ Fast development with Vite
- ⚛️ React 18 with modern hooks
- 🎨 Beautiful UI with Tailwind CSS
- 📱 Responsive design
- ✨ Interactive components (Counter, Task Manager)

## Getting Started

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

Supported **image** types: JPEG, PNG, GIF, WebP.  
Supported **3D model** types: GLB, GLTF, OBJ, FBX, STL, DAE, 3DS, PLY.

## Customization

Feel free to customize this app to build your own features! The current implementation includes:

- Interactive counter component
- Task manager with add/complete/delete functionality
- Modern, responsive UI design

Happy coding! 🚀

