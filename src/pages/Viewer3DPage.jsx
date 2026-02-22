import { Link } from 'react-router-dom';
import Viewer3D from '../components/Viewer3D';

export default function Viewer3DPage() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <div className="flex items-center justify-between gap-4 p-3 border-b-2 border-black bg-gray-100 shrink-0">
        <Link
          to="/"
          className="text-[10px] font-black uppercase tracking-widest hover:underline"
        >
          ← Back to Hub
        </Link>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Arch Zone 3D Viewer</span>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <Viewer3D className="flex-1 min-h-0 flex flex-col" fullPage />
      </div>
    </div>
  );
}
