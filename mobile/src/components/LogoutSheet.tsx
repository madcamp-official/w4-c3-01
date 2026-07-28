// Ported from frontend/src/components/LogoutSheet.tsx — keep in sync.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheetModal from '@/components/BottomSheetModal';
import SketchyButton from '@/components/SketchyButton';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';
import { colors, radius } from '@/theme/colors';
import { common } from '@/theme/common';

export default function LogoutSheet() {
  const { logoutOpen, closeLogout } = useOverlay();
  const { logoutUser } = useAppState();
  const { showToast } = useToast();

  function handleLogout() {
    closeLogout();
    logoutUser();
    showToast('로그아웃 했어요 👋');
  }

  return (
    <BottomSheetModal open={logoutOpen} onClose={closeLogout} sheetStyle={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>계정</Text>
      <SketchyButton variant="ghost" style={{ marginBottom: 10 }} onPress={handleLogout}>
        <Text style={[common.btnGhostText, { color: colors.danger }]}>로그아웃</Text>
      </SketchyButton>
      <Pressable style={{ alignSelf: 'center', padding: 6 }} onPress={closeLogout}>
        <Text style={common.linkBtnText}>취소</Text>
      </Pressable>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 16, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10 }
});
