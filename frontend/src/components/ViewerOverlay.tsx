import { useEffect, useRef } from 'react';
import { replayStrokes, setupHiDPI } from '@/lib/canvas';
import { useOverlay } from '@/state/OverlayContext';

export default function ViewerOverlay() {
  const { viewer, closeViewer } = useOverlay();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!viewer || !canvasRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (canvasRef.current) ctxRef.current = setupHiDPI(canvasRef.current);
    });
    return () => cancelAnimationFrame(raf);
  }, [viewer]);

  if (!viewer) return null;

  function handleReplay() {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current || !viewer?.strokes) return;
    const rect = canvas.getBoundingClientRect();
    replayStrokes(viewer.strokes, ctxRef.current, rect.width, rect.height, 5, 1400);
  }

  return (
    <div className="overlay open">
      <div className="viewer-top">
        <button className="icon-btn sk" onClick={closeViewer} aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="viewer-media sk2">
        <img src={viewer.image} alt="" />
        <canvas ref={canvasRef} />
      </div>
      <div className="viewer-bottom">
        <div className="viewer-caption">{viewer.caption}</div>
        {viewer.strokes ? (
          <button className="btn primary sk" onClick={handleReplay}>
            ✏️ 다시 쓰는 순간 보기
          </button>
        ) : null}
      </div>
    </div>
  );
}
