// Replaces frontend/src/lib/canvas.ts's replayStrokes (which needs a <canvas>).
// Renders StrokePoint[] as an animated react-native-svg <Path>, revealing more
// of the stroke over `duration` ms — same visual idea as the web version's
// requestAnimationFrame loop.
import { useEffect, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import type { StrokePoint } from '@/types';
import { colors } from '@/theme/colors';

function strokesToPath(strokes: StrokePoint[], count: number, w: number, h: number): string {
  let d = '';
  for (let i = 0; i < count; i++) {
    const p = strokes[i];
    const x = p.x * w;
    const y = p.y * h;
    d += p.move || i === 0 ? `M${x},${y} ` : `L${x},${y} `;
  }
  return d;
}

interface StrokeReplayProps {
  strokes: StrokePoint[];
  width: number;
  height: number;
  duration?: number;
  strokeWidth?: number;
  onDone?: () => void;
}

export default function StrokeReplay({ strokes, width, height, duration = 1400, strokeWidth = 5, onDone }: StrokeReplayProps) {
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
      <Path d={strokesToPath(strokes, count, width, height)} stroke={colors.ink} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
