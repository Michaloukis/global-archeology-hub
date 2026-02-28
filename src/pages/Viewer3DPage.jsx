import Arch3DVisualizer from '../components/Arch3DVisualizer';

export default function Viewer3DPage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-black">
      <Arch3DVisualizer showBackToHub backToUrl="/" />
    </div>
  );
}
