// Hand-drawn "sketchy" path geometry.
//
// The web app gets its wobbly borders/icons from an SVG feTurbulence +
// feDisplacementMap filter (see frontend/src/components/SketchyDefs.tsx).
// react-native-svg exposes those filter primitives in JS, but Android has no
// native FeTurbulence/FeDisplacementMap view backing them (only Blend,
// ColorMatrix, Composite, Flood, GaussianBlur, Merge, Offset are implemented),
// so the filter silently no-ops there. Instead we precompute a jittered path
// with a seeded PRNG, so every render of the same element produces the exact
// same "hand-drawn" wobble instead of re-randomizing on every re-render.

function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** A rounded-rect outline nudged off the ideal line at each corner/edge point. */
export function sketchyRoundedRect(width: number, height: number, radius: number, seed: string, wobble = 1.6): string {
  if (width <= 0 || height <= 0) return ''
  const rand = seededRandom(seed)
  const jitter = () => (rand() - 0.5) * 2 * wobble
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))

  const p0: [number, number] = [r + jitter(), jitter()]
  const p1: [number, number] = [width - r + jitter(), jitter()]
  const c1: [number, number] = [width + jitter(), jitter()]
  const p2: [number, number] = [width + jitter(), r + jitter()]
  const p3: [number, number] = [width + jitter(), height - r + jitter()]
  const c2: [number, number] = [width + jitter(), height + jitter()]
  const p4: [number, number] = [width - r + jitter(), height + jitter()]
  const p5: [number, number] = [r + jitter(), height + jitter()]
  const c3: [number, number] = [jitter(), height + jitter()]
  const p6: [number, number] = [jitter(), height - r + jitter()]
  const p7: [number, number] = [jitter(), r + jitter()]
  const c4: [number, number] = [jitter(), jitter()]

  return [
    `M ${p0[0]} ${p0[1]}`,
    `L ${p1[0]} ${p1[1]}`,
    `Q ${c1[0]} ${c1[1]} ${p2[0]} ${p2[1]}`,
    `L ${p3[0]} ${p3[1]}`,
    `Q ${c2[0]} ${c2[1]} ${p4[0]} ${p4[1]}`,
    `L ${p5[0]} ${p5[1]}`,
    `Q ${c3[0]} ${c3[1]} ${p6[0]} ${p6[1]}`,
    `L ${p7[0]} ${p7[1]}`,
    `Q ${c4[0]} ${c4[1]} ${p0[0]} ${p0[1]}`,
    'Z'
  ].join(' ')
}

/** A single hand-drawn horizontal line (for hr-style top/bottom dividers). */
export function sketchyHLine(width: number, seed: string, wobble = 1.1): string {
  if (width <= 0) return ''
  const rand = seededRandom(seed)
  const jitter = () => (rand() - 0.5) * 2 * wobble
  const midX = width / 2
  return `M 0 ${jitter()} Q ${midX + jitter()} ${jitter() * 1.6} ${width} ${jitter()}`
}

/** Small random transform applied to an icon glyph so repeated strokes don't perfectly overlap. */
export function sketchyIconJitter(seed: string, pass: number) {
  const rand = seededRandom(`${seed}-${pass}`)
  const dx = (rand() - 0.5) * 1.1
  const dy = (rand() - 0.5) * 1.1
  const rotate = (rand() - 0.5) * 5
  return { dx, dy, rotate }
}

// ---------------------------------------------------------------------------
// "Blob" border shape — matches the CSS the design prototype uses:
//   variant a: border-radius: 255px 18px 225px 18px / 18px 225px 18px 255px
//   variant b: border-radius: 225px 18px 255px 18px / 18px 255px 18px 225px
// (order per corner is TL, TR, BR, BL; before the slash is the horizontal
// radius, after is the vertical radius — i.e. every corner is an ellipse,
// not a circle). Browsers scale all 8 radii down by the same factor when
// they'd overlap on a given edge (CSS Backgrounds §corner-overlap); we
// replicate that exact algorithm so small buttons/inputs come out the same
// gentle asymmetric curve the web version gets natively, instead of a plain
// pill or a dramatic single rounded corner.
export type BlobVariant = 'a' | 'b'

interface EllipseCorner {
  rx: number
  ry: number
}

function blobCornerRadii(width: number, height: number, variant: BlobVariant): { tl: EllipseCorner; tr: EllipseCorner; br: EllipseCorner; bl: EllipseCorner } {
  const h = variant === 'a' ? [255, 18, 225, 18] : [225, 18, 255, 18]
  const v = variant === 'a' ? [18, 225, 18, 255] : [18, 255, 18, 225]
  const topF = width / (h[0] + h[1])
  const rightF = height / (v[1] + v[2])
  const bottomF = width / (h[2] + h[3])
  const leftF = height / (v[3] + v[0])
  const f = Math.max(0, Math.min(1, topF, rightF, bottomF, leftF))
  return {
    tl: { rx: h[0] * f, ry: v[0] * f },
    tr: { rx: h[1] * f, ry: v[1] * f },
    br: { rx: h[2] * f, ry: v[2] * f },
    bl: { rx: h[3] * f, ry: v[3] * f }
  }
}

/** Approximate per-corner circular radius (RN's native View border only supports circular corners) for the wrapped View's own clipping/background — the precise elliptical shape is what actually gets painted, via the SVG path from sketchyBlobRect. */
export function blobCornerRadiiForNative(width: number, height: number, variant: BlobVariant) {
  const { tl, tr, br, bl } = blobCornerRadii(width, height, variant)
  return {
    borderTopLeftRadius: (tl.rx + tl.ry) / 2,
    borderTopRightRadius: (tr.rx + tr.ry) / 2,
    borderBottomRightRadius: (br.rx + br.ry) / 2,
    borderBottomLeftRadius: (bl.rx + bl.ry) / 2
  }
}

/** Smoothly-varying (correlated) pseudo-noise, so neighboring perimeter samples drift gently instead of jumping — avoids the sharp pinches/gaps independent per-point jitter can cause. */
function makeNoise(seed: string) {
  const rand = seededRandom(seed)
  const waves = [1, 2, 3].map(() => ({
    freq: 0.05 + rand() * 0.08,
    phase: rand() * Math.PI * 2,
    amp: 0.5 + rand() * 0.5
  }))
  return (t: number) => waves.reduce((sum, w) => sum + Math.sin(t * w.freq + w.phase) * w.amp, 0) / waves.length
}

/** The wobbled outline of the blob shape above, as a dense polyline (closed path). */
export function sketchyBlobRect(width: number, height: number, variant: BlobVariant, seed: string, wobble = 1.4): string {
  if (width <= 0 || height <= 0) return ''
  const { tl, tr, br, bl } = blobCornerRadii(width, height, variant)
  const noise = makeNoise(seed)
  const STEP = 7

  const pts: [number, number][] = []
  let t = 0

  function pushArc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number) {
    const arcLen = Math.max(rx, ry) * Math.abs(a1 - a0)
    const steps = Math.max(2, Math.round(arcLen / STEP))
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps
      const bx = cx + rx * Math.cos(a)
      const by = cy + ry * Math.sin(a)
      const n = noise(t) * wobble
      pts.push([bx + Math.cos(a) * n, by + Math.sin(a) * n])
      t += STEP
    }
  }

  function pushEdge(x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) {
    const len = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.round(len / STEP))
    for (let i = 1; i < steps; i++) {
      const px = x0 + ((x1 - x0) * i) / steps
      const py = y0 + ((y1 - y0) * i) / steps
      const n = noise(t) * wobble
      pts.push([px + nx * n, py + ny * n])
      t += STEP
    }
  }

  pushArc(tl.rx, tl.ry, tl.rx, tl.ry, Math.PI, Math.PI * 1.5)
  pushEdge(tl.rx, 0, width - tr.rx, 0, 0, -1)
  pushArc(width - tr.rx, tr.ry, tr.rx, tr.ry, Math.PI * 1.5, Math.PI * 2)
  pushEdge(width, tr.ry, width, height - br.ry, 1, 0)
  pushArc(width - br.rx, height - br.ry, br.rx, br.ry, 0, Math.PI * 0.5)
  pushEdge(width - br.rx, height, bl.rx, height, 0, 1)
  pushArc(bl.rx, height - bl.ry, bl.rx, bl.ry, Math.PI * 0.5, Math.PI)
  pushEdge(0, height - bl.ry, 0, tl.ry, -1, 0)

  if (pts.length < 3) return ''
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} `
  for (let i = 1; i < pts.length; i++) d += `L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)} `
  d += 'Z'
  return d
}
