// Hand-drawn border overlay — RN equivalent of the web's `.sk`/`.sk2` classes
// (global.css), which draw a real border on a ::before pseudo-element and then
// distort it with an SVG feTurbulence/feDisplacementMap filter. Android's
// react-native-svg has no native backing for that filter pair, so this draws
// an already-wobbled path instead (see src/lib/sketchyPath.ts) and overlays it
// on top of the wrapped content, matching the pseudo-element approach — it
// never affects layout, only paints on top.
//
// Two shapes:
//   - "round": a plain circle/rounded-rect (radius prop) — used for circular
//     icon buttons, where the design prototype just uses border-radius:50%.
//   - "blob": the design prototype's asymmetric pill shape (see
//     sketchyBlobRect) — used for buttons/inputs/chat bubbles. Pass `fill` to
//     also paint the shape's own background via the same SVG path, since RN
//     Views can only clip to circular per-corner radii and would show square
//     corners poking out past the blob's tight (18px) corners otherwise.
//   `shadow` draws the prototype's hard-edge offset "sticker" shadow behind
//   the shape, using the exact same (wobbled) outline offset by (dx, dy).
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { blobCornerRadiiForNative, sketchyBlobRect, sketchyRoundedRect, type BlobVariant } from '@/lib/sketchyPath';

const PAD = 4;

type Props = {
  children?: ReactNode;
  shape?: 'round' | 'blob';
  radius?: number;
  variant?: BlobVariant;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  shadow?: { dx: number; dy: number; color?: string };
  style?: StyleProp<ViewStyle>;
  seed?: string;
};

export default function Sketchy({
  children,
  shape = 'round',
  radius = 16,
  variant = 'a',
  color = colors.ink,
  fill,
  strokeWidth = 1.6,
  shadow,
  style,
  seed = 'sk'
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  }, []);

  const ready = size.w > 0 && size.h > 0;
  const nativeRadius = shape === 'blob' && ready ? blobCornerRadiiForNative(size.w, size.h, variant) : undefined;

  const pathD = useMemo(() => {
    if (!ready) return ''
    return shape === 'blob'
      ? sketchyBlobRect(size.w, size.h, variant, seed)
      : sketchyRoundedRect(size.w, size.h, radius, `${seed}-${variant}`)
  }, [ready, shape, size.w, size.h, variant, seed, radius])

  return (
    <View style={[style, nativeRadius, fill ? { backgroundColor: 'transparent' } : null]} onLayout={onLayout}>
      {ready && shadow ? (
        <Svg
          width={size.w + PAD * 2}
          height={size.h + PAD * 2}
          style={{ position: 'absolute', top: -PAD + shadow.dy, left: -PAD + shadow.dx }}
          pointerEvents="none"
        >
          <G transform={`translate(${PAD} ${PAD})`}>
            <Path d={pathD} fill={shadow.color ?? 'rgba(34,31,26,0.12)'} stroke="none" />
          </G>
        </Svg>
      ) : null}
      {ready ? (
        <Svg
          width={size.w + PAD * 2}
          height={size.h + PAD * 2}
          style={{ position: 'absolute', top: -PAD, left: -PAD }}
          pointerEvents="none"
        >
          <G transform={`translate(${PAD} ${PAD})`}>
            <Path
              d={pathD}
              stroke={color}
              strokeWidth={strokeWidth}
              fill={fill ?? 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
