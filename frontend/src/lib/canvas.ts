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

export function setupHiDPI(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Jittered ink line: mimics a shaky hand-drawn pen rather than a perfectly smooth vector. */
export function inkSegment(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  weight: number
) {
  const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * weight * 0.35;
  const my = (a.y + b.y) / 2 + (Math.random() - 0.5) * weight * 0.35;
  ctx.strokeStyle = INK;
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(mx, my, b.x, b.y);
  ctx.stroke();
}

export function drawStrokesStatic(
  ctx: CanvasRenderingContext2D,
  strokes: StrokePoint[],
  w: number,
  h: number,
  weight?: number
) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = weight || 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let prev: { x: number; y: number } | null = null;
  strokes.forEach((p) => {
    const pt = { x: p.x * w, y: p.y * h };
    if (p.move || !prev) {
      prev = pt;
      return;
    }
    inkSegment(ctx, prev, pt, weight || 5);
    prev = pt;
  });
}

export function replayStrokes(
  strokes: StrokePoint[],
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weight: number,
  duration: number,
  sourceAspect: number = w / h,
  onDone?: () => void
) {
  if (!strokes || !strokes.length) {
    onDone?.();
    return;
  }
  // Strokes are normalized 0..1 against the *original* capture canvas, which
  // isn't always the same aspect ratio as the viewer's <img object-fit:contain>
  // — without matching that letterboxing here, the replayed path reads as
  // stretched/offset relative to the (smaller, centered) visible photo.
  const renderedW = Math.min(w, sourceAspect * h);
  const renderedH = Math.min(h, w / sourceAspect);
  const offsetX = (w - renderedW) / 2;
  const offsetY = (h - renderedH) / 2;

  const total = strokes.length;
  let start: number | null = null;
  function frame(ts: number) {
    if (start === null) start = ts;
    const elapsed = ts - start;
    const count = Math.min(total, Math.ceil((elapsed / duration) * total));
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = weight || 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let prev: { x: number; y: number } | null = null;
    for (let k = 0; k < count; k++) {
      const p = strokes[k];
      const pt = { x: offsetX + p.x * renderedW, y: offsetY + p.y * renderedH };
      if (p.move || !prev) {
        prev = pt;
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      prev = pt;
    }
    if (count < total) requestAnimationFrame(frame);
    else onDone?.();
  }
  requestAnimationFrame(frame);
}

export function renderStrokesToDataURL(strokes: StrokePoint[], size: number, weight?: number): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#F2ECDA';
  ctx.fillRect(0, 0, size, size);
  drawStrokesStatic(ctx, strokes, size, size, weight || size * 0.02);
  return c.toDataURL('image/png');
}
