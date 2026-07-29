// Border/fill overlay — RN equivalent of the web's `.sk`/`.sk2` classes
// (global.css). Draws a plain outline+background on top of the wrapped
// content; never affects layout beyond the border's own (tiny) width.
//
// Two shapes:
//   - "round": a plain circle/rounded-rect (radius prop) — used for circular
//     icon buttons, where border-radius would just be 50%.
//   - "blob": now a plain pill (was an asymmetric shape in the earlier
//     design) — used for buttons/inputs/chat bubbles.
//
// This used to hand-draw the border (and, with `fill`, the background too)
// as a custom SVG path sized/positioned from a manual onLayout measurement —
// several rounds of real-device reports kept finding new edges of things
// clipped by a hair (border stroke, then fill, then children), each fix
// papering over one symptom of the same root problem: a hand-built
// approximation of what a plain native border already does correctly. Since
// blobCornerRadii (sketchyPath.ts) already always produces a *circular* (not
// truly elliptical) per-corner radius today — the design dropped the old
// asymmetric wobble — a real `borderRadius`/`borderWidth`/`backgroundColor`
// reproduces the exact same shape pixel-for-pixel, with none of the custom
// path's edge cases.
import { useCallback, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { blobCornerRadiiForNative, type BlobVariant } from '@/lib/sketchyPath';

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
  style
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  }, []);

  const ready = size.w > 0 && size.h > 0;
  const cornerStyle =
    shape === 'blob' && ready
      ? blobCornerRadiiForNative(size.w, size.h, variant)
      : { borderRadius: ready ? Math.max(0, Math.min(radius, size.w / 2, size.h / 2)) : radius };

  return (
    <View
      // `fill` (when passed) always wins, same as before — but when it's
      // *not* passed, the background must be left alone rather than forced
      // to transparent, or a caller relying on their own `style`'s
      // backgroundColor (e.g. the tab bar's solid-ink plus button, the
      // avatar-edit badge's paper circle) goes invisible.
      style={[style, cornerStyle, { borderWidth: strokeWidth, borderColor: color }, fill ? { backgroundColor: fill } : null]}
      onLayout={onLayout}
    >
      {children}
    </View>
  );
}
