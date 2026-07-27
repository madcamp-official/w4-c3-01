// Hand-drawn single horizontal rule — RN equivalent of the web's `.sk-hr-t`/
// `.sk-hr-b` classes (a wobbled top/bottom divider line). See Sketchy.tsx for
// why this is precomputed geometry rather than an SVG filter.
import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { sketchyHLine } from '@/lib/sketchyPath';

// See Sketchy.tsx for why the canvas needs padding — RNSVG hard-clips at its
// own width/height with no "overflow: visible" escape hatch.
const PAD = 4;

type Props = {
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  seed?: string;
};

export default function SketchyLine({ color = colors.line, strokeWidth = 1.6, style, seed = 'hr' }: Props) {
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (prev === w ? prev : w));
  }, []);

  return (
    <View style={[{ height: 6 }, style]} onLayout={onLayout}>
      {width > 0 ? (
        <Svg
          width={width + PAD * 2}
          height={6 + PAD * 2}
          style={{ position: 'absolute', top: -PAD, left: -PAD }}
          pointerEvents="none"
        >
          <G transform={`translate(${PAD} ${PAD + 3})`}>
            <Path d={sketchyHLine(width, seed)} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          </G>
        </Svg>
      ) : null}
    </View>
  );
}
