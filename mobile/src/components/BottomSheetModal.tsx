// Shared bottom-sheet chrome for LogoutSheet/ShareSheet. (CommentSheet used
// to be built on this too, but its keyboard-avoidance never worked here no
// matter what was tried — see CommentScreen.tsx, which replaced it with a
// real navigation screen instead. Neither remaining user of this component
// has a text input, so that problem doesn't apply to them.)
//
// Rendered as a plain absolute overlay sibling (App.tsx mounts this after
// NavigationContainer, so it already paints on top) rather than RN's
// <Modal>, which renders in its own native Android Dialog window — separate
// from the app's main window. BackHandler below replaces the hardware-back
// handling a Modal would normally provide via onRequestClose.
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!rendered) return null;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[sheetAnimatedStyle, sheetStyle]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', zIndex: 50, elevation: 50 },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20,17,12,0.5)'
  }
});
