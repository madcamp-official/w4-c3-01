// Ported from frontend/src/components/Toast.tsx — keep in sync.
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';

export default function Toast() {
  const { colors } = useTheme();
  const { message, visible } = useToast();
  if (!visible) return null;
  const styles = makeStyles(colors);
  return <Text style={styles.toast}>{message}</Text>;
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    toast: {
      position: 'absolute',
      bottom: 100,
      alignSelf: 'center',
      // Was a fixed dark bubble with colors.paper text — fine in light mode
      // (white text on dark bg) but colors.paper flips to black in dark
      // mode, so it was black-on-near-black there. ink/paper flip together
      // across the theme so the bubble always contrasts against itself.
      backgroundColor: colors.ink,
      color: colors.paper,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radius.pill,
      fontSize: 13,
      overflow: 'hidden'
    }
  });
}
