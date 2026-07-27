// Drop-in replacement for `<Pressable style={[common.btn, common.btnPrimary|btnGhost]}>`
// that adds the hand-drawn blob border/shadow back (see Sketchy.tsx). Callers
// keep their own <Text> children/label styling untouched — only the outer
// frame changes. Pass `blobVariant="b"` on the second of two adjacent buttons
// to get the design prototype's alternating blob shape (see LoginScreen for
// an example).
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import Sketchy from '@/components/Sketchy';
import { colors } from '@/theme/colors';
import type { BlobVariant } from '@/lib/sketchyPath';

type Props = {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  blobVariant?: BlobVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function SketchyButton({ children, onPress, variant = 'ghost', blobVariant = 'a', disabled, style }: Props) {
  const isPrimary = variant === 'primary';
  const shadowDx = blobVariant === 'a' ? 1.5 : -1.5;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      <Sketchy
        shape="blob"
        variant={blobVariant}
        seed={`btn-${blobVariant}`}
        color={isPrimary ? colors.paper : colors.line}
        fill={isPrimary ? colors.ink : '#fff'}
        shadow={{ dx: shadowDx, dy: 2 }}
        strokeWidth={2}
        style={styles.base}
      >
        {children}
      </Sketchy>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
