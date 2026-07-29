// Replaces frontend/src/lib/canvas.ts's replayStrokes (which needs a <canvas>).
// Renders StrokePoint[] as an animated react-native-svg <Path>, revealing more
// of the stroke over `duration` ms — same visual idea as the web version's
// requestAnimationFrame loop.
import { useEffect, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import type { StrokePoint } from '@/types';
import { useTheme } from '@/state/ThemeContext';

function strokesToPath(strokes: StrokePoint[], count: number, w: number, h: number, sourceAspect: number): string {
  // Strokes are normalized 0..1 against the *original* capture canvas, which
  // isn't always the same aspect ratio as the display box — <Image
  // resizeMode="cover"> crops the photo to fit, so without the same crop
  // applied here the stroke path reads as squashed relative to the photo.
  const containerAspect = w / h;
  let xMin = 0;
  let xMax = 1;
  let yMin = 0;
  let yMax = 1;
  if (sourceAspect > containerAspect) {
    // source relatively wider than the box — height matches, width overflows/crops
    const visible = containerAspect / sourceAspect;
    xMin = (1 - visible) / 2;
    xMax = 1 - xMin;
  } else if (sourceAspect < containerAspect) {
    // source relatively taller than the box — width matches, height overflows/crops
    const visible = sourceAspect / containerAspect;
    yMin = (1 - visible) / 2;
    yMax = 1 - yMin;
  }

  let d = '';
  for (let i = 0; i < count; i++) {
    const p = strokes[i];
    const x = ((p.x - xMin) / (xMax - xMin)) * w;
    const y = ((p.y - yMin) / (yMax - yMin)) * h;
    d += p.move || i === 0 ? `M${x},${y} ` : `L${x},${y} `;
  }
  return d;
}

interface StrokeReplayProps {
  strokes: StrokePoint[];
  width: number;
  height: number;
  /** Original capture canvas's width/height ratio — defaults to `width/height` (no crop adjustment) when the source image's own aspect isn't known. */
  sourceAspect?: number;
  duration?: number;
  strokeWidth?: number;
  onDone?: () => void;
}

export default function StrokeReplay({
  strokes,
  width,
  height,
  sourceAspect,
  duration = 1400,
  strokeWidth = 5,
  onDone
}: StrokeReplayProps) {
  const { colors } = useTheme();
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!strokes.length) {
      onDone?.();
      return;
    }
    startRef.current = null;
    setCount(0);

    function frame(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const next = Math.min(strokes.length, Math.ceil((elapsed / duration) * strokes.length));
      setCount(next);
      if (next < strokes.length) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        onDone?.();
      }
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, duration]);

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Path
        d={strokesToPath(strokes, count, width, height, sourceAspect ?? width / height)}
        stroke={colors.ink}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
