import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Illustrator2DPage from './pages/Illustrator2DPage.jsx'
import Viewer3DPage from './pages/Viewer3DPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/illustrator-2d" element={<Illustrator2DPage />} />
        <Route path="/viewer-3d" element={<Viewer3DPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
