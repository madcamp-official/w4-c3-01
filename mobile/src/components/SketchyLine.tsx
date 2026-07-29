// Plain horizontal divider rule — RN equivalent of the web's `.sk-hr-t`/
// `.sk-hr-b` classes. Used to draw a flat straight line (no hand-drawn wobble
// in the current design), so unlike Sketchy.tsx/the old version of this file
// it doesn't need extra vertical headroom for a curve to bulge into — the
// box is sized to just fit the stroke itself. A taller box than the visible
// line was exactly the bug: it reserved space below the line that read as a
// stray gap wherever this sits between two sections (chat header, tab bar).
import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/state/ThemeContext';

// Horizontal-only headroom, for the round line-cap's slight overflow past
// the 0/width endpoints — RNSVG hard-clips at its own declared width/height
// (unlike a plain View, which defaults to overflow: visible).
const PAD_X = 2;

type Props = {
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  seed?: string;
};

export default function SketchyLine({ color, strokeWidth = 1.6, style }: Props) {
  const { colors } = useTheme();
  const lineColor = color ?? colors.border;
  const [width, setWidth] = useState(0);
  const boxHeight = Math.ceil(strokeWidth) + 1;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (prev === w ? prev : w));
  }, []);

  return (
    <View style={[{ height: boxHeight }, style]} onLayout={onLayout}>
      {width > 0 ? (
        <Svg
          width={width + PAD_X * 2}
          height={boxHeight}
          style={{ position: 'absolute', top: 0, left: -PAD_X }}
          pointerEvents="none"
        >
          <Path
            d={`M ${PAD_X} ${boxHeight / 2} L ${width + PAD_X} ${boxHeight / 2}`}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}
