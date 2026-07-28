// Portable subset of frontend/src/lib/canvas.ts — keep in sync.
// The canvas-rasterization helpers (setupHiDPI/inkSegment/drawStrokesStatic/
// replayStrokes/renderStrokesToDataURL) stay web-only; RN replays strokes via
// react-native-svg instead (see components/StrokeReplay.tsx).
import type { StrokePoint } from '@/types';

export const INK = '#1E1B16';
export const PEN_WEIGHTS = [3.2, 6];

/** Parametric heart curve, normalized 0..1, single continuous stroke. */
export function heartStrokeNormalized(n = 90): StrokePoint[] {
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push({ x, y });
  }
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 0.12;
  return raw.map((p, i) => ({
    x: pad + (1 - 2 * pad) * ((p.x - minX) / (maxX - minX)),
    y: pad + (1 - 2 * pad) * ((p.y - minY) / (maxY - minY)),
    move: i === 0
  }));
}

/** Small random scribble used for seed/mock content. */
export function randomScribble(): StrokePoint[] {
  const pts: StrokePoint[] = [];
  const steps = 50;
  const seedA = Math.random() * 10;
  const seedB = Math.random() * 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = 0.5 + 0.3 * Math.sin(t * Math.PI * 2.2 + seedA) * Math.cos(t * 3 + seedB);
    const y = 0.18 + t * 0.62 + 0.07 * Math.sin(t * Math.PI * 5 + seedA);
    pts.push({ x: Math.min(0.9, Math.max(0.1, x)), y: Math.min(0.9, Math.max(0.1, y)), move: i === 0 });
  }
  return pts;
}
