// Drop-in replacement for `<TextInput style={common.input} />` that adds the
// hand-drawn blob border/shadow back (mirrors web's `input.sk` — see
// Sketchy.tsx). Pass `blobVariant="b"` to alternate with a neighboring field,
// matching the design prototype's pattern of alternating shapes down a form.
import { forwardRef } from 'react';
import {
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Sketchy from '@/components/Sketchy';
import { useTheme } from '@/state/ThemeContext';
import type { BlobVariant } from '@/lib/sketchyPath';

type Props = TextInputProps & {
  blobVariant?: BlobVariant;
  /** 'round' with an explicit `radius` gives a normal rounded-rect frame
   * instead of the default pill — for taller multiline fields (e.g. a bio
   * textarea), where the pill's corner radius scales up to half the field's
   * height and ends up looking like a stretched capsule. */
  shape?: 'round' | 'blob';
  radius?: number;
};

const SketchyInput = forwardRef<TextInput, Props>(function SketchyInput(
  { style, blobVariant = 'a', shape = 'blob', radius, ...props },
  ref
) {
  const { colors } = useTheme();
  return (
    <Sketchy
      shape={shape}
      variant={blobVariant}
      radius={radius}
      color={colors.border}
      fill={colors.paper}
      strokeWidth={1.4}
      seed={`input-${blobVariant}`}
      style={[
        props.multiline ? undefined : { justifyContent: 'center' },
        style as StyleProp<ViewStyle>,
      ]}
    >
      <TextInput
        ref={ref}
        placeholderTextColor={colors.inkSoft}
        {...props}
        style={{
          width: '100%',
          paddingHorizontal: 18,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.ink,
        }}
      />
    </Sketchy>
  );
});

export default SketchyInput;
