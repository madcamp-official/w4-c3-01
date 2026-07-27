// Drop-in replacement for `<TextInput style={common.input} />` that adds the
// hand-drawn blob border/shadow back (mirrors web's `input.sk` — see
// Sketchy.tsx). Pass `blobVariant="b"` to alternate with a neighboring field,
// matching the design prototype's pattern of alternating shapes down a form.
import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import Sketchy from '@/components/Sketchy';
import { colors } from '@/theme/colors';
import type { BlobVariant } from '@/lib/sketchyPath';

type Props = TextInputProps & { blobVariant?: BlobVariant };

const SketchyInput = forwardRef<TextInput, Props>(function SketchyInput({ style, blobVariant = 'a', ...props }, ref) {
  const shadowDx = blobVariant === 'a' ? 1.5 : -1.5;
  return (
    <Sketchy
      shape="blob"
      variant={blobVariant}
      color={colors.line}
      fill="#fff"
      shadow={{ dx: shadowDx, dy: 2 }}
      strokeWidth={2}
      seed={`input-${blobVariant}`}
      style={[props.multiline ? undefined : { justifyContent: 'center' }, style]}
    >
      <TextInput
        ref={ref}
        placeholderTextColor={colors.inkSoft}
        {...props}
        style={{
          paddingHorizontal: 18,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.ink
        }}
      />
    </Sketchy>
  );
});

export default SketchyInput;
