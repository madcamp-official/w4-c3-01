// Shared bottom-sheet chrome for LogoutSheet/CommentSheet/ShareSheet.
//
// RN's <Modal animationType="slide"> slides its ENTIRE content view — backdrop
// and sheet together — up from off-screen as a single unit, no matter how
// they're positioned relative to each other inside it. That read as "a dark
// translucent screen rising up together with the sheet" instead of a dim that
// just appears behind a sheet sliding up. Animating them separately (backdrop
// fades in place, sheet slides) needs animationType="none" plus our own
// Reanimated values, which also means holding the Modal mounted a bit longer
// on close so the exit animation is visible before it actually unmounts.
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const ANIM_DURATION = 220;

export default function BottomSheetModal({
  open,
  onClose,
  children,
  sheetStyle
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
}) {
  const [rendered, setRendered] = useState(open);
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(60);

  useEffect(() => {
    if (open) {
      setRendered(true);
      backdropOpacity.value = withTiming(1, { duration: ANIM_DURATION });
      translateY.value = withTiming(0, { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) });
    } else {
      backdropOpacity.value = withTiming(0, { duration: ANIM_DURATION });
      translateY.value = withTiming(60, { duration: ANIM_DURATION, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[sheetAnimatedStyle, sheetStyle]}>{children}</Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,17,12,0.5)' }
});
