import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { drawStrokesStatic, heartStrokeNormalized, inkSegment, setupHiDPI } from '@/lib/canvas';

export interface HeartCanvasHandle {
  clear: () => void;
  getDataUrl: () => string;
  fillDefault: () => void;
}

interface HeartCanvasProps {
  onDrawStateChange?: (hasDrawn: boolean) => void;
}

const HeartCanvas = forwardRef<HeartCanvasHandle, HeartCanvasProps>(({ onDrawStateChange }, ref) => {
  const guideRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const drawCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const onDrawStateChangeRef = useRef(onDrawStateChange);
  onDrawStateChangeRef.current = onDrawStateChange;

  useEffect(() => {
    const guide = guideRef.current;
    const draw = drawRef.current;
    if (!guide || !draw) return;

    const guideCtx = setupHiDPI(guide);
    const drawCtx = setupHiDPI(draw);
    drawCtxRef.current = drawCtx;
    const rect = guide.getBoundingClientRect();
    drawStrokesStatic(guideCtx, heartStrokeNormalized(), rect.width, rect.height, 3);
    guide.style.opacity = '0.4';
    drawCtx.clearRect(0, 0, rect.width, rect.height);

    let drawing = false;
    let last: { x: number; y: number } | null = null;
    function pos(e: PointerEvent) {
      const r = draw!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function down(e: PointerEvent) {
      drawing = true;
      last = pos(e);
      onDrawStateChangeRef.current?.(true);
      try {
        draw!.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    function move(e: PointerEvent) {
      if (!drawing || !last) return;
      const p = pos(e);
      inkSegment(drawCtx, last, p, 4.5);
      last = p;
    }
    function up() {
      drawing = false;
      last = null;
    }

    draw.addEventListener('pointerdown', down);
    draw.addEventListener('pointermove', move);
    draw.addEventListener('pointerup', up);
    draw.addEventListener('pointerleave', up);
    return () => {
      draw.removeEventListener('pointerdown', down);
      draw.removeEventListener('pointermove', move);
      draw.removeEventListener('pointerup', up);
      draw.removeEventListener('pointerleave', up);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const draw = drawRef.current;
      const ctx = drawCtxRef.current;
      if (!draw || !ctx) return;
      const rect = draw.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      onDrawStateChangeRef.current?.(false);
    },
    getDataUrl: () => drawRef.current?.toDataURL('image/png') ?? '',
    fillDefault: () => {
      const draw = drawRef.current;
      const ctx = drawCtxRef.current;
      if (!draw || !ctx) return;
      const rect = draw.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      drawStrokesStatic(ctx, heartStrokeNormalized(), rect.width, rect.height, 5);
    }
  }));

  return (
    <div className="heart-stage sk">
      <canvas className="heart-canvas guide" ref={guideRef} />
      <canvas className="heart-canvas draw" ref={drawRef} />
    </div>
  );
});
HeartCanvas.displayName = 'HeartCanvas';

export default HeartCanvas;
