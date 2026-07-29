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

/** A rounded-rect outline — `wobble` defaults to 0 (plain, no hand-drawn jitter) since the v2 design dropped the sketchy look; kept as a param so callers/signatures don't need to change.
 * Corners are drawn with real SVG elliptical arcs (not a quadratic-Bezier
 * approximation), so a full-circle icon button (radius === width/2 === height/2,
 * e.g. the post/search/chat round buttons) traces an actual circle instead of
 * a visibly squarish/blobby approximation. */
export function sketchyRoundedRect(width: number, height: number, radius: number, seed: string, wobble = 0): string {
  if (width <= 0 || height <= 0) return ''
  const rand = seededRandom(seed)
  const jitter = () => (rand() - 0.5) * 2 * wobble
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))

  if (r <= 0) {
    return `M ${jitter()} ${jitter()} L ${width + jitter()} ${jitter()} L ${width + jitter()} ${height + jitter()} L ${jitter()} ${height + jitter()} Z`
  }

  return [
    `M ${r + jitter()} ${jitter()}`,
    `L ${width - r + jitter()} ${jitter()}`,
    `A ${r} ${r} 0 0 1 ${width + jitter()} ${r + jitter()}`,
    `L ${width + jitter()} ${height - r + jitter()}`,
    `A ${r} ${r} 0 0 1 ${width - r + jitter()} ${height + jitter()}`,
    `L ${r + jitter()} ${height + jitter()}`,
    `A ${r} ${r} 0 0 1 ${jitter()} ${height - r + jitter()}`,
    `L ${jitter()} ${r + jitter()}`,
    `A ${r} ${r} 0 0 1 ${r + jitter()} ${jitter()}`,
    'Z'
  ].join(' ')
}

/** A single horizontal divider line — plain (wobble defaults to 0, see sketchyRoundedRect). */
export function sketchyHLine(width: number, seed: string, wobble = 0): string {
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

function blobCornerRadii(width: number, height: number, _variant: BlobVariant): { tl: EllipseCorner; tr: EllipseCorner; br: EllipseCorner; bl: EllipseCorner } {
  // v2 design dropped the asymmetric "blob" shape for a plain pill — using an
  // oversized equal radius on every corner and letting the same overlap-scaling
  // math below shrink it produces an exact pill (min(width,height)/2), the same
  // way `border-radius: 999px` behaves in CSS. `variant` no longer changes the
  // outcome (both 'a'/'b' now render identically) but stays in the signature
  // so call sites don't need to change.
  const h = [999, 999, 999, 999]
  const v = [999, 999, 999, 999]
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

/** The outline of the blob (now plain pill) shape above — real SVG elliptical
 * arcs per corner (wobble defaults to 0, see sketchyRoundedRect), not the
 * dense polyline this used to be. The old version sampled each corner's
 * curve into straight-line segments every ~7px, which looked visibly
 * faceted/angular on larger elements (chat bubbles, search box, buttons) —
 * an `A` arc traces the exact ellipse at any size. */
export function sketchyBlobRect(width: number, height: number, variant: BlobVariant, _seed: string, _wobble = 0): string {
  if (width <= 0 || height <= 0) return ''
  const { tl, tr, br, bl } = blobCornerRadii(width, height, variant)

  return [
    `M ${tl.rx} 0`,
    `L ${width - tr.rx} 0`,
    `A ${tr.rx} ${tr.ry} 0 0 1 ${width} ${tr.ry}`,
    `L ${width} ${height - br.ry}`,
    `A ${br.rx} ${br.ry} 0 0 1 ${width - br.rx} ${height}`,
    `L ${bl.rx} ${height}`,
    `A ${bl.rx} ${bl.ry} 0 0 1 0 ${height - bl.ry}`,
    `L 0 ${tl.ry}`,
    `A ${tl.rx} ${tl.ry} 0 0 1 ${tl.rx} 0`,
    'Z'
  ].join(' ')
}
