import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const MIN_PHOTOS = 8;
const RECOMMENDED_PHOTOS = 20;

/** Generate a simple placeholder .obj mesh (icosphere-like) for the scan result. */
function buildPlaceholderObj(name = 'scan') {
  const r = 1;
  const segments = 8;
  const vertices = [];
  const faces = [];
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    for (let long = 0; long <= segments; long++) {
      const phi = (long * 2 * Math.PI) / segments;
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta) * Math.sin(phi);
      vertices.push([x, y, z]);
    }
  }
  for (let lat = 0; lat < segments; lat++) {
    for (let long = 0; long < segments; long++) {
      const i = lat * (segments + 1) + long + 1;
      const a = i;
      const b = i + segments + 1;
      const c = i + segments + 2;
      const d = i + 1;
      faces.push([a, b, c]);
      faces.push([a, c, d]);
    }
  }
  const vLines = vertices.map(([x, y, z]) => `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`).join('\n');
  const fLines = faces.map((f) => `f ${f.join(' ')}`).join('\n');
  return `# ${name} - 3D scan placeholder\n# Open in 3D Viewer to inspect\n\n${vLines}\n\n${fLines}\n`;
}

/** Generate a minimal Collada .dae mesh (same sphere) for 3D Viewer. */
function buildPlaceholderDae(name = 'scan') {
  const r = 1;
  const segments = 8;
  const positions = [];
  const indices = [];
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    for (let long = 0; long <= segments; long++) {
      const phi = (long * 2 * Math.PI) / segments;
      positions.push(r * Math.sin(theta) * Math.cos(phi), r * Math.cos(theta), r * Math.sin(theta) * Math.sin(phi));
    }
  }
  for (let lat = 0; lat < segments; lat++) {
    for (let long = 0; long < segments; long++) {
      const i = lat * (segments + 1) + long;
      const a = i;
      const b = i + segments + 1;
      const c = i + segments + 2;
      const d = i + 1;
      indices.push(a, b, c, a, c, d);
    }
  }
  const posStr = positions.map((n) => n.toFixed(6)).join(' ');
  const idxStr = indices.join(' ');
  const count = indices.length;
  return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset><created>${new Date().toISOString()}</created><modified>${new Date().toISOString()}</modified></asset>
  <library_geometries>
    <geometry id="${name}-mesh">
      <mesh>
        <source id="${name}-positions">
          <float_array id="${name}-positions-array" count="${positions.length}">${posStr}</float_array>
          <technique_common><accessor source="#${name}-positions-array" count="${positions.length / 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common>
        </source>
        <vertices id="${name}-vertices"><input semantic="POSITION" source="#${name}-positions"/></vertices>
        <triangles count="${count / 3}"><input semantic="VERTEX" source="#${name}-vertices" offset="0"/><p>${idxStr}</p></triangles>
      </mesh>
    </geometry>
  </library_geometries>
  <library_materials><material id="mat"><instance_effect url="#effect"/></material></library_materials>
  <library_effects><effect id="effect"><profile_COMMON><technique><lambert><diffuse><color>0.8 0.8 0.8 1</color></diffuse></lambert></technique></profile_COMMON></effect></library_effects>
  <library_visual_scenes>
    <visual_scene id="Scene">
      <node id="scan"><instance_geometry url="#${name}-mesh"><bind_material><technique_common><instance_material symbol="mat" target="#mat"/></technique_common></bind_material></instance_geometry></node>
    </visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#Scene"/></scene>
</COLLADA>`;
}

export default function Scanner3D({ onBack }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const [captures, setCaptures] = useState([]);
  const [exported, setExported] = useState(null); // { scanName }

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        setError('');
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        setError(e?.message || 'Camera access denied. Use HTTPS and allow camera permission.');
      }
    };
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptures((prev) => [...prev, dataUrl]);
  };

  const finishAndExport = () => {
    const scanName = `scan-${Date.now()}`;
    setExported({ scanName });
  };

  const downloadObj = () => {
    if (!exported) return;
    const content = buildPlaceholderObj(exported.scanName);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exported.scanName}.obj`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDae = () => {
    if (!exported) return;
    const content = buildPlaceholderDae(exported.scanName);
    const blob = new Blob([content], { type: 'model/vnd.collada+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exported.scanName}.dae`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInViewer = () => {
    if (!exported) return;
    navigate('/viewer-3d');
  };

  const count = captures.length;
  const canExport = count >= MIN_PHOTOS;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black">
      {!exported ? (
        <>
          <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            {error ? (
              <div className="p-6 text-center text-white">
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  <p className="text-white/90 text-xs text-center mb-2">
                    Move around the object and capture {RECOMMENDED_PHOTOS}+ photos for best results.
                  </p>
                  <p className="text-white/70 text-center text-sm mb-3">
                    {count} / {RECOMMENDED_PHOTOS} captured
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={capture}
                      className="rounded-full w-16 h-16 border-4 border-white bg-white/20 flex items-center justify-center text-white shrink-0"
                      aria-label="Capture photo"
                    >
                      <span className="w-12 h-12 rounded-full bg-white block" />
                    </button>
                    <button
                      type="button"
                      onClick={finishAndExport}
                      disabled={!canExport}
                      className="rounded-xl bg-ink text-white px-5 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Finish & save .obj
                    </button>
                  </div>
                  {count > 0 && count < MIN_PHOTOS && (
                    <p className="text-amber-300 text-xs text-center mt-2">Capture at least {MIN_PHOTOS} photos.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-white text-center">
          <p className="text-lg font-semibold mb-2">Scan saved</p>
          <p className="text-sm text-white/80 mb-4">{exported.scanName}.obj / .dae</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={downloadObj}
              className="rounded-xl bg-white text-black py-3 px-4 text-sm font-bold uppercase"
            >
              Download .obj
            </button>
            <button
              type="button"
              onClick={downloadDae}
              className="rounded-xl bg-white/90 text-black py-3 px-4 text-sm font-bold uppercase"
            >
              Download .dae
            </button>
            <button
              type="button"
              onClick={openInViewer}
              className="rounded-xl bg-ink text-white py-3 px-4 text-sm font-bold uppercase"
            >
              Open in 3D Viewer
            </button>
            <button
              type="button"
              onClick={() => { setExported(null); setCaptures([]); }}
              className="rounded-xl border border-white/50 text-white py-3 px-4 text-sm font-medium"
            >
              New scan
            </button>
          </div>
          <p className="text-xs text-white/60 mt-6">
            Save as .obj or .dae and load in 3D Viewer to rotate and inspect. Full photogrammetry can be added later.
          </p>
        </div>
      )}
    </div>
  );
}
