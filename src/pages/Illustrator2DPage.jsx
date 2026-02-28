import { ErrorBoundary } from '../arch2d-illustrator/ErrorBoundary';
import App from '../arch2d-illustrator/App';

export default function Illustrator2DPage() {
  return (
    <div className="min-h-screen bg-stone-100">
      <ErrorBoundary>
        <App showBackToHub backToUrl="/" />
      </ErrorBoundary>
    </div>
  );
}
