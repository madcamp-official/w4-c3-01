import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { drawStrokesStatic, heartStrokeNormalized, renderStrokesToDataURL, setupHiDPI } from '@/lib/canvas';
import { useCamera } from '@/hooks/useCamera';
import { useTrailCanvas } from '@/hooks/useTrailCanvas';

export interface HeartAirwriteHandle {
  clear: () => void;
  getDataUrl: () => string;
}

interface HeartAirwriteStageProps {
  onDrawStateChange?: (hasDrawn: boolean) => void;
}

const HEART_WEIGHT = 4.5;
const OUTPUT_SIZE = 220;

/** Heart "좋아요" icon input, drawn by air-writing in front of the camera instead of touch-drawing directly. */
const HeartAirwriteStage = forwardRef<HeartAirwriteHandle, HeartAirwriteStageProps>(({ onDrawStateChange }, ref) => {
  const guideRef = useRef<HTMLCanvasElement>(null);
  const { videoRef, cameraAvailable } = useCamera('user');
  const trail = useTrailCanvas();
  const onDrawStateChangeRef = useRef(onDrawStateChange);
  onDrawStateChangeRef.current = onDrawStateChange;

  useEffect(() => {
    trail.resize();
    trail.clear();
    trail.setWeight(HEART_WEIGHT);

    const guide = guideRef.current;
    if (guide) {
      const guideCtx = setupHiDPI(guide);
      const rect = guide.getBoundingClientRect();
      drawStrokesStatic(guideCtx, heartStrokeNormalized(), rect.width, rect.height, 3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = trail.canvasRef.current;
    if (!canvas) return;
    let started = false;
    function handlePointerDown() {
      if (started) return;
      started = true;
      onDrawStateChangeRef.current?.(true);
    }
    canvas.addEventListener('pointerdown', handlePointerDown);
    return () => canvas.removeEventListener('pointerdown', handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      trail.clear();
      onDrawStateChangeRef.current?.(false);
    },
    getDataUrl: () => renderStrokesToDataURL(trail.getStrokes(), OUTPUT_SIZE, 6)
  }));

  return (
    <div className="heart-stage sk">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          display: cameraAvailable ? 'block' : 'none',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)'
        }}
      />
      {!cameraAvailable ? <div className="cam-fallback" /> : null}
      <canvas ref={guideRef} className="heart-canvas" style={{ background: 'transparent', opacity: 0.45, pointerEvents: 'none' }} />
      <canvas ref={trail.canvasRef} className="heart-canvas draw" style={{ background: 'transparent' }} />
    </div>
  );
});
HeartAirwriteStage.displayName = 'HeartAirwriteStage';

export default HeartAirwriteStage;
