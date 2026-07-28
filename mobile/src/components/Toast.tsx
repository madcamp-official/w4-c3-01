// Ported from frontend/src/components/Toast.tsx — keep in sync.
import { StyleSheet, Text } from 'react-native';
import { useToast } from '@/state/ToastContext';
import { colors, radius } from '@/theme/colors';

export default function Toast() {
  const { message, visible } = useToast();
  if (!visible) return null;
  return <Text style={styles.toast}>{message}</Text>;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,27,22,0.92)',
    color: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    fontSize: 13,
    overflow: 'hidden'
  }
});
