import { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

function SceneContent({ modelObject }) {
  return (
    <>
      <OrbitControls makeDefault />
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <gridHelper args={[20, 20, 0x444444, 0x222222]} />
      {modelObject ? (
        <primitive object={modelObject} />
      ) : (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      )}
    </>
  );
}

export default function Viewer3D({ onClose, className = '', fullPage = false }) {
  const [modelObject, setModelObject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = useCallback((file) => {
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    const url = URL.createObjectURL(file);
    setLoading(true);
    setError('');

    const cleanup = () => {
      URL.revokeObjectURL(url);
      setLoading(false);
    };

    if (name.endsWith('.obj')) {
      const loader = new OBJLoader();
      loader.load(
        url,
        (obj) => {
          setModelObject(obj);
          cleanup();
        },
        undefined,
        (err) => {
          setError(err?.message || 'Failed to load OBJ');
          cleanup();
        }
      );
    } else if (name.endsWith('.stl')) {
      const loader = new STLLoader();
      loader.load(
        url,
        (geometry) => {
          const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
          const mesh = new THREE.Mesh(geometry, mat);
          setModelObject(mesh);
          cleanup();
        },
        undefined,
        (err) => {
          setError(err?.message || 'Failed to load STL');
          cleanup();
        }
      );
    } else {
      setError('Use .obj or .stl');
      cleanup();
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  return (
    <div className={`flex flex-col bg-white border-4 border-black overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-4 p-3 border-b-2 border-black bg-gray-100 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest">3D Viewer // Arch Zone</span>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".obj,.stl"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase hover:bg-black hover:text-white disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load .obj / .stl'}
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
      <div className={`w-full bg-gray-900 ${fullPage ? 'flex-1 min-h-[300px]' : 'h-[400px] min-h-[300px]'}`}>
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }} gl={{ antialias: true }}>
          <SceneContent modelObject={modelObject} />
        </Canvas>
      </div>
    </div>
  );
}
