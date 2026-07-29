// Drop-in replacement for `<Pressable style={[common.btn, common.btnPrimary|btnGhost]}>`
// with a themed pill frame (see Sketchy.tsx). Callers keep their own <Text>
// children/label styling untouched — only the outer frame changes.
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import Sketchy from '@/components/Sketchy';
import { useTheme } from '@/state/ThemeContext';
import type { BlobVariant } from '@/lib/sketchyPath';

type Props = {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  blobVariant?: BlobVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Override the ghost variant's default (soft) border color — e.g. mypage's
   * profile-edit/redraw-heart pair uses a bolder ink-colored border. */
  borderColor?: string;
};

export default function SketchyButton({ children, onPress, variant = 'ghost', blobVariant = 'a', disabled, style, borderColor }: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      <Sketchy
        shape="blob"
        variant={blobVariant}
        seed={`btn-${blobVariant}`}
        color={isPrimary ? 'transparent' : (borderColor ?? colors.border)}
        fill={isPrimary ? colors.accent : colors.paper}
        strokeWidth={1.4}
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
