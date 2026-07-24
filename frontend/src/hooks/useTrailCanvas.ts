import { useCallback, useEffect, useRef } from 'react';
import { PEN_WEIGHTS, inkSegment } from '@/lib/canvas';
import type { StrokePoint } from '@/types';

export interface TrailCanvasApi {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  resize: () => void;
  clear: () => void;
  setWeight: (w: number) => void;
  getStrokes: () => StrokePoint[];
}

/** Persistent hand-drawn ink trail on a canvas — used by the camera air-write and chat air-write composer. */
export function useTrailCanvas(): TrailCanvasApi {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const weightRef = useRef(PEN_WEIGHTS[0]);
  const strokesRef = useRef<StrokePoint[]>([]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    strokesRef.current = [];
  }, []);

  const setWeight = useCallback((w: number) => {
    weightRef.current = w;
  }, []);

  const getStrokes = useCallback(() => strokesRef.current.slice(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function normPos(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    }
    function toPixel(p: { x: number; y: number }) {
      const rect = canvas!.getBoundingClientRect();
      return { x: p.x * rect.width, y: p.y * rect.height };
    }
    function down(e: PointerEvent) {
      drawingRef.current = true;
      const p = normPos(e);
      lastRef.current = p;
      strokesRef.current.push({ x: p.x, y: p.y, move: true });
      try {
        canvas!.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    function move(e: PointerEvent) {
      if (!drawingRef.current || !ctxRef.current) return;
      const p = normPos(e);
      if (lastRef.current) inkSegment(ctxRef.current, toPixel(lastRef.current), toPixel(p), weightRef.current);
      strokesRef.current.push({ x: p.x, y: p.y, move: false });
      lastRef.current = p;
    }
    function up() {
      drawingRef.current = false;
      lastRef.current = null;
    }

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', up);

    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', up);
    };
  }, []);

  return { canvasRef, resize, clear, setWeight, getStrokes };
}
