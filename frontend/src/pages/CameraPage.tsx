import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WeightPicker from '@/components/WeightPicker';
import { useCamera } from '@/hooks/useCamera';
import { useTrailCanvas } from '@/hooks/useTrailCanvas';
import { useToast } from '@/state/ToastContext';
import type { CameraNavState, PreviewNavState } from '@/types-nav';

export default function CameraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const intent = (location.state as CameraNavState | null)?.intent ?? { kind: 'post' as const };

  const { videoRef, cameraAvailable } = useCamera('user');
  const trail = useTrailCanvas();
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    trail.resize();
    trail.clear();
    const t = setTimeout(() => setHintVisible(false), 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleShutter() {
    const stage = document.getElementById('cam-stage');
    const video = videoRef.current;
    const trailCanvas = trail.canvasRef.current;
    if (!stage || !trailCanvas) return;
    const stageRect = stage.getBoundingClientRect();
    const out = document.createElement('canvas');
    out.width = Math.round(stageRect.width);
    out.height = Math.round(stageRect.height);
    const octx = out.getContext('2d')!;
    if (video && cameraAvailable) {
      octx.save();
      octx.translate(out.width, 0);
      octx.scale(-1, 1);
      try {
        octx.drawImage(video, 0, 0, out.width, out.height);
      } catch {
        /* video not ready yet */
      }
      octx.restore();
      octx.fillStyle = 'rgba(242,236,218,0.55)';
      octx.fillRect(0, 0, out.width, out.height);
    } else {
      octx.fillStyle = '#F2ECDA';
      octx.fillRect(0, 0, out.width, out.height);
    }
    try {
      octx.drawImage(trailCanvas, 0, 0, out.width, out.height);
    } catch {
      /* noop */
    }
    const previewState: PreviewNavState = { image: out.toDataURL('image/png'), strokes: trail.getStrokes(), intent };
    navigate('/preview', { state: previewState });
  }

  return (
    <section className="screen active" id="screen-camera">
      <div className="cam-frame sk2" id="cam-stage" style={intent.kind === 'post' ? { margin: 0 } : undefined}>
        <video ref={videoRef} autoPlay playsInline muted style={{ display: cameraAvailable ? 'block' : 'none' }} />
        {!cameraAvailable ? <div className="cam-fallback" /> : null}
        <canvas className="trail-canvas" ref={trail.canvasRef} />
        <div className="cam-topbar">
          <button
            className="icon-btn sk"
            onClick={() => navigate(intent.kind === 'lounge' ? `/lounges/${intent.loungeId}` : '/feed')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <WeightPicker onChange={trail.setWeight} />
        </div>
        {hintVisible ? (
          <div className="cam-hint sk" style={{ transition: 'opacity .5s' }}>
            손가락으로 그어 허공에 써보세요 ✍️
          </div>
        ) : null}
        <div className="cam-botbar">
          <button className="side-btn sk" onClick={() => trail.clear()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
          <button className="shutter sk2" aria-label="촬영" onClick={handleShutter} />
          <button className="side-btn sk" onClick={() => showToast('이 프로토타입에서는 전면 카메라만 지원해요')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 2l4 4-4 4" />
              <path d="M3 12v-2a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 12v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
