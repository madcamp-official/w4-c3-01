// Only handles chat air-write message thumbnails (image + caption + optional
// stroke replay) — viewing an actual post now goes through PostDetailPage
// instead, which also owns the "본인 글이면 삭제하기" gating.
import { useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { replayStrokes, setupHiDPI } from '@/lib/canvas';
import { useOverlay } from '@/state/OverlayContext';

export default function ViewerOverlay() {
  const { viewer, closeViewer } = useOverlay();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

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
    const img = imgRef.current;
    const sourceAspect = img?.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : rect.width / rect.height;
    replayStrokes(viewer.strokes, ctxRef.current, rect.width, rect.height, 5, 1400, sourceAspect);
  }

  return (
    <div className="overlay open">
      <div className="viewer-top">
        <button className="icon-btn sk" onClick={closeViewer} aria-label="닫기">
          <Icon name="x" size={22} />
        </button>
      </div>
      <div className="viewer-media sk2">
        <img ref={imgRef} src={viewer.image} alt="" />
        <canvas ref={canvasRef} />
      </div>
      <div className="viewer-bottom">
        <div className="viewer-caption">{viewer.caption}</div>
        {viewer.strokes ? (
          <button className="btn primary sk" onClick={handleReplay}>
            다시 쓰는 순간 보기
          </button>
        ) : null}
      </div>
    </div>
  );
}
