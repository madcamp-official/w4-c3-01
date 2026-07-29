import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Current software-keyboard height in px (0 when hidden) — used to trim
 * padding that's only needed when the keyboard *isn't* covering that space
 * (e.g. ChatThreadScreen's input row drops its extra nav-bar clearance while
 * the keyboard is up, since the keyboard already occupies that area).
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
