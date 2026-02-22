import { useState, useRef, useCallback } from 'react';

const SVG_WIDTH = 400;
const SVG_HEIGHT = 300;

// Simple silhouette extraction: grayscale + threshold, then sample profile points (left edge per row)
function extractProfileFromImage(image, steps = 80) {
  const c = document.createElement('canvas');
  c.width = image.naturalWidth;
  c.height = image.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const data = id.data;
  const points = [];
  const rowStep = Math.max(1, Math.floor(c.height / steps));
  for (let y = 0; y < c.height; y += rowStep) {
    let found = false;
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (g < 180) {
        points.push({ x: (x / c.width) * SVG_WIDTH, y: (y / c.height) * SVG_HEIGHT });
        found = true;
        break;
      }
    }
    if (!found) points.push({ x: 0, y: (y / c.height) * SVG_HEIGHT });
  }
  // Close path along bottom and right
  if (points.length) {
    points.push({ x: SVG_WIDTH, y: SVG_HEIGHT });
    points.push({ x: 0, y: SVG_HEIGHT });
    points.push(points[0]);
  }
  return points;
}

export default function Illustrator2D({ onClose, className = '' }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [profilePoints, setProfilePoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageLoad = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setProfilePoints([]);
    return () => URL.revokeObjectURL(url);
  }, []);

  const handleExtractProfile = useCallback(() => {
    if (!imageUrl) return;
    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const points = extractProfileFromImage(img);
        setProfilePoints(points);
      } finally {
        setLoading(false);
      }
    };
    img.onerror = () => setLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  const handleClear = useCallback(() => {
    setProfilePoints([]);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
  }, [imageUrl]);

  const handleExportSVG = useCallback(() => {
    const pathD = profilePoints.length > 1
      ? profilePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
      : '';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" width="${SVG_WIDTH}" height="${SVG_HEIGHT}">
  ${pathD ? `<path fill="none" stroke="#000" stroke-width="2" d="${pathD}"/>` : ''}
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'arch-illustration.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [profilePoints]);

  const pathD = profilePoints.length > 1
    ? profilePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
    : '';

  return (
    <div className={`flex flex-col bg-white border-4 border-black overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-4 p-3 border-b-2 border-black bg-gray-100 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest">2D Illustrator // Arch Zone</span>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageLoad}
            className="hidden"
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-black hover:text-white">
            From photo
          </button>
          <button
            type="button"
            onClick={handleExtractProfile}
            disabled={!imageUrl || loading}
            className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-black hover:text-white disabled:opacity-50"
          >
            {loading ? '…' : 'Extract profile'}
          </button>
          <button type="button" onClick={handleClear} className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-red-600 hover:text-white hover:border-red-600">
            Clear
          </button>
          <button type="button" onClick={handleExportSVG} disabled={!pathD} className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-black hover:text-white disabled:opacity-50">
            Export SVG
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-black hover:text-white">
              Close
            </button>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col items-center">
        <p className="text-[9px] font-bold text-gray-500 uppercase mb-2 w-full">Side-view photo, plain background → Extract profile for silhouette</p>
        <div className="w-full max-w-full overflow-auto border-2 border-black bg-gray-100" style={{ width: SVG_WIDTH, height: SVG_HEIGHT }}>
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} width="100%" height="100%" className="block">
            {imageUrl && (
              <image href={imageUrl} width={SVG_WIDTH} height={SVG_HEIGHT} preserveAspectRatio="xMidYMid slice" opacity="0.4" />
            )}
            {pathD && <path fill="rgba(139,69,19,0.3)" stroke="#000" strokeWidth="2" d={pathD} />}
          </svg>
        </div>
      </div>
    </div>
  );
}
