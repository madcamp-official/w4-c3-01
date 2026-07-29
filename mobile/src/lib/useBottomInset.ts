import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// On some Android devices/builds react-native-safe-area-context reports a
// bottom inset of 0 (or something too small) even though the system 3-button
// or gesture nav bar is actually occupying real screen space — content
// pinned to `edges={['bottom']}` on those devices still ends up drawn
// underneath the bar. There's no reliable way from here to read the real
// system nav bar height, so this is a pragmatic floor: trust the reported
// inset when it's large enough to look intentional, otherwise fall back to a
// value that clears a typical nav bar instead of 0.
const ANDROID_BOTTOM_FLOOR = 24;

export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'android') return Math.max(insets.bottom, ANDROID_BOTTOM_FLOOR);
  return insets.bottom;
}
