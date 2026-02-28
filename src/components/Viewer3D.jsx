import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

const GRID_SIZE = 20;
const GRID_DIVISIONS = 20;
const WHITE = 0xffffff;
const GRID_SECONDARY = 0x8899aa;
const DEFAULT_CUBE_COLOR = '#e67e22'; // orange to match reference

function SceneContent({ modelObject, standalone }) {
  return (
    <>
      <OrbitControls makeDefault />
      <ambientLight intensity={standalone ? 0.6 : 0.8} />
      <directionalLight position={[10, 10, 5]} intensity={standalone ? 1.2 : 1} />
      <gridHelper args={[GRID_SIZE, GRID_DIVISIONS, WHITE, GRID_SECONDARY]} />
      {modelObject ? (
        <primitive object={modelObject} />
      ) : (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={DEFAULT_CUBE_COLOR} />
        </mesh>
      )}
    </>
  );
}

const Viewer3D = forwardRef(function Viewer3D({ onClose, className = '', fullPage = false, standalone = false }, ref) {
  const [modelObject, setModelObject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [featureOn, setFeatureOn] = useState(true);
  const [sceneOption, setSceneOption] = useState('Default Cube');
  const [sourceOption, setSourceOption] = useState('Presets');
  const [sceneDropdownOpen, setSceneDropdownOpen] = useState(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  const clearModel = useCallback(() => {
    setModelObject(null);
    setSceneOption('Default Cube');
  }, []);

  useImperativeHandle(ref, () => ({
    openFileDialog: () => fileInputRef.current?.click(),
    clear: clearModel,
  }), [clearModel]);

  const loadFile = useCallback((file) => {
    if (!file) return;
    setSceneOption('Loaded Model');
    const name = (file.name || '').toLowerCase();
    const url = URL.createObjectURL(file);
    setLoading(true);
    setError('');

    const cleanup = () => {
      URL.revokeObjectURL(url);
      setLoading(false);
    };

    const onErr = (err) => {
      setError(err?.message || 'Load failed');
      cleanup();
    };

    if (name.endsWith('.obj')) {
      const loader = new OBJLoader();
      loader.load(url, (obj) => { setModelObject(obj); cleanup(); }, undefined, onErr);
    } else if (name.endsWith('.stl')) {
      const loader = new STLLoader();
      loader.load(
        url,
        (geometry) => {
          const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
          setModelObject(new THREE.Mesh(geometry, mat));
          cleanup();
        },
        undefined,
        onErr
      );
    } else if (name.endsWith('.glb') || name.endsWith('.gltf')) {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (data) => {
          setModelObject(data.scene);
          cleanup();
        },
        undefined,
        onErr
      );
    } else if (name.endsWith('.fbx')) {
      const loader = new FBXLoader();
      loader.load(url, (obj) => { setModelObject(obj); cleanup(); }, undefined, onErr);
    } else if (name.endsWith('.dae')) {
      const loader = new ColladaLoader();
      loader.load(
        url,
        (data) => {
          setModelObject(data.scene);
          cleanup();
        },
        undefined,
        onErr
      );
    } else if (name.endsWith('.ply')) {
      const loader = new PLYLoader();
      loader.load(
        url,
        (geometry) => {
          const mat = new THREE.MeshStandardMaterial({ color: 0x888888, vertexColors: geometry.hasAttribute('color') });
          setModelObject(new THREE.Mesh(geometry, mat));
          cleanup();
        },
        undefined,
        onErr
      );
    } else {
      setError('Use .obj, .stl, .glb, .gltf, .fbx, .dae, or .ply');
      cleanup();
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  const handleExportJson = useCallback(() => {
    const data = { scene: sceneOption, source: sourceOption, feature: featureOn, hasModel: !!modelObject };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'arch-zone-scene.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [sceneOption, sourceOption, featureOn, modelObject]);

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (data.scene) setSceneOption(data.scene);
        if (data.source) setSourceOption(data.source);
        if (typeof data.feature === 'boolean') setFeatureOn(data.feature);
      } catch (_) {}
    };
    r.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className={`flex flex-col overflow-hidden ${standalone ? '' : 'bg-white border-4 border-black'} ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".obj,.stl,.glb,.gltf,.fbx,.dae,.ply"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportJson}
        className="hidden"
        aria-hidden
      />
      {!standalone && (
        <>
          <div className="flex items-center justify-between gap-4 p-3 border-b-2 border-black bg-gray-100 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest">3D Viewer // Arch Zone</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-black hover:text-white disabled:opacity-50 min-h-[44px]"
              >
                {loading ? 'Loading…' : 'Load 3D model'}
              </button>
              {modelObject && (
                <button
                  type="button"
                  onClick={() => setModelObject(null)}
                  className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-red-600 hover:text-white hover:border-red-600"
                >
                  Clear
                </button>
              )}
              {onClose && (
                <button type="button" onClick={onClose} className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-black hover:text-white">
                  Close
                </button>
              )}
            </div>
          </div>
          {error && <p className="text-[10px] font-bold text-red-600 uppercase px-3 py-1 bg-red-50">{error}</p>}
        </>
      )}
      <div
        className={`w-full ${standalone ? 'bg-[#0a0e17]' : 'bg-gray-900'} ${fullPage ? 'flex-1 min-h-0 flex flex-col' : 'h-[400px] min-h-[300px]'} relative`}
        style={fullPage ? { minHeight: 0 } : undefined}
      >
        {fullPage ? (
          <div className="flex-1 min-h-0 relative w-full" style={{ minHeight: 0 }}>
            <Canvas
              gl={{ antialias: true }}
              style={{ height: '100%', width: '100%', display: 'block', background: standalone ? '#0a0e17' : undefined }}
            >
              <SceneContent modelObject={modelObject} standalone={standalone} />
            </Canvas>
          </div>
        ) : (
          <Canvas gl={{ antialias: true }}>
            <SceneContent modelObject={modelObject} standalone={standalone} />
          </Canvas>
        )}
        {standalone && (
          <>
            {/* Top left: ≡ Tools menu */}
            <div className="absolute top-4 left-4 z-10">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setToolsOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-2 border border-[#2a3548] bg-[#0a0e17]/95 text-white text-xs font-medium hover:bg-[#1a2234] rounded"
                >
                  <span className="text-base leading-none">≡</span>
                  Tools
                </button>
                {toolsOpen && (
                  <>
                    <div className="absolute left-0 top-full mt-1 py-1 min-w-[180px] border border-[#3a4556] bg-[#0a0e17] rounded shadow-xl z-20">
                      <button
                        type="button"
                        onClick={() => setFeatureOn((v) => !v)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1a2234] border-l-2 ${featureOn ? 'border-green-500 bg-green-500/10' : 'border-transparent'}`}
                      >
                        <span className="w-4 h-4 flex items-center justify-center border border-current rounded-sm">{featureOn ? '✓' : ''}</span>
                        Feature: {featureOn ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleExportJson(); setToolsOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1a2234] border-l-2 border-sky-400"
                      >
                        <span className="text-[10px]">↓</span>
                        Export JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => { jsonInputRef.current?.click(); setToolsOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1a2234] border-l-2 border-cyan-400"
                      >
                        <span className="text-[10px]">↑</span>
                        Import JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => { fileInputRef.current?.click(); setToolsOpen(false); }}
                        disabled={loading}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1a2234] border-l-2 border-amber-600 disabled:opacity-50"
                      >
                        <span className="text-[10px]">📁</span>
                        Import Model
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1a2234] border-l-2 border-amber-600 opacity-70"
                        title="Not supported in browser"
                      >
                        <span className="text-[10px]">📁</span>
                        Import Folder
                      </button>
                      {modelObject && (
                        <button
                          type="button"
                          onClick={() => { clearModel(); setToolsOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#1a2234] border-l-2 border-red-500/80"
                        >
                          Clear model
                        </button>
                      )}
                    </div>
                    <button type="button" aria-label="Close menu" className="fixed inset-0 z-[5]" onClick={() => setToolsOpen(false)} />
                  </>
                )}
              </div>
            </div>
            {/* Bottom left: SCENE and SOURCE dropdowns */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setSceneDropdownOpen((o) => !o); setSourceDropdownOpen(false); }}
                  className="flex items-center justify-between gap-3 px-3 py-2 min-w-[160px] border border-[#2a3548] bg-[#0a0e17]/95 text-white text-xs font-medium hover:bg-[#1a2234] rounded"
                >
                  <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">Scene:</span>
                  <span className="flex-1 text-left truncate">{sceneOption}</span>
                  <span className="text-[10px]">▼</span>
                </button>
                {sceneDropdownOpen && (
                  <>
                    <div className="absolute left-0 bottom-full mb-1 py-1 min-w-[160px] border border-[#2a3548] bg-[#0a0e17] rounded shadow-lg z-20">
                      {['Default Cube', 'Loaded Model'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setSceneOption(opt); setSceneDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs text-white hover:bg-[#1a2234] ${sceneOption === opt ? 'bg-[#1a2234]' : ''}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <button type="button" aria-label="Close" className="fixed inset-0 z-[5]" onClick={() => setSceneDropdownOpen(false)} />
                  </>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setSourceDropdownOpen((o) => !o); setSceneDropdownOpen(false); }}
                  className="flex items-center justify-between gap-3 px-3 py-2 min-w-[160px] border border-[#2a3548] bg-[#0a0e17]/95 text-white text-xs font-medium hover:bg-[#1a2234] rounded"
                >
                  <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">Source:</span>
                  <span className="flex-1 text-left truncate">{sourceOption}</span>
                  <span className="text-[10px]">▼</span>
                </button>
                {sourceDropdownOpen && (
                  <>
                    <div className="absolute left-0 bottom-full mb-1 py-1 min-w-[160px] border border-[#2a3548] bg-[#0a0e17] rounded shadow-lg z-20">
                      {['Presets', 'Upload'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setSourceOption(opt); setSourceDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs text-white hover:bg-[#1a2234] ${sourceOption === opt ? 'bg-[#1a2234]' : ''}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <button type="button" aria-label="Close" className="fixed inset-0 z-[5]" onClick={() => setSourceDropdownOpen(false)} />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default Viewer3D;
