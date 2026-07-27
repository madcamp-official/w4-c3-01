import { useLocation, useNavigate } from 'react-router-dom';
import { AirDrawingStage, type AirDrawingCapture } from '@/features/air-drawing/AirDrawingStage';
import { useToast } from '@/state/ToastContext';
import type { CameraNavState, PreviewNavState } from '@/types-nav';

export default function CameraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const intent = (location.state as CameraNavState | null)?.intent ?? { kind: 'post' as const };

  function closeCamera() {
    navigate(intent.kind === 'lounge' ? `/lounges/${intent.loungeId}` : '/feed');
  }

  function handleCapture(capture: AirDrawingCapture) {
    const previewState: PreviewNavState = {
      image: capture.image,
      strokes: capture.strokes,
      drawing: capture.drawing,
      intent
    };
    navigate('/preview', { state: previewState });
  }

  return (
    <section className="screen active" id="screen-camera">
      <AirDrawingStage onClose={closeCamera} onCapture={handleCapture} onError={showToast} />
    </section>
  );
}
