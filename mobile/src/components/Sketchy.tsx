// Border overlay — RN equivalent of the web's `.sk`/`.sk2` classes
// (global.css). Draws a plain outline (see src/lib/sketchyPath.ts — the v2
// design dropped the hand-drawn wobble, so those helpers now emit plain
// shapes) on top of the wrapped content; never affects layout, only paints.
//
// Two shapes:
//   - "round": a plain circle/rounded-rect (radius prop) — used for circular
//     icon buttons, where border-radius would just be 50%.
//   - "blob": now a plain pill (was an asymmetric shape in the earlier
//     design) — used for buttons/inputs/chat bubbles. Pass `fill` to also
//     paint the shape's own background via the same SVG path, since RN Views
//     can only clip to circular per-corner radii and would show square
//     corners poking out past the tight corners otherwise.
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
