// Ported from frontend/src/components/ShareSheet.tsx — keep in sync.
import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheetModal from '@/components/BottomSheetModal';
import Icon from '@/components/Icon';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';
import { colors, radius } from '@/theme/colors';

export default function ShareSheet() {
  const { sharePostId, closeShare } = useOverlay();
  const { showToast } = useToast();
  const open = Boolean(sharePostId);

  async function handleOption(kind: 'link' | 'chat') {
    closeShare();
    if (kind === 'link') {
      await Clipboard.setStringAsync(`aline://posts/${sharePostId}`);
      showToast('링크를 복사했어요');
    } else {
      showToast('채팅 목록에서 보낼 친구를 선택하세요');
    }
  }

  return (
    <BottomSheetModal open={open} onClose={closeShare} sheetStyle={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>공유하기</Text>
      <Pressable style={styles.option} onPress={() => handleOption('link')}>
        <Icon name="link" size={20} color={colors.ink} />
        <Text style={styles.optionText}>링크 복사</Text>
      </Pressable>
      <Pressable style={styles.option} onPress={() => handleOption('chat')}>
        <Icon name="message-square" size={20} color={colors.ink} />
        <Text style={styles.optionText}>채팅으로 보내기</Text>
      </Pressable>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 16, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  optionText: { fontSize: 14, color: colors.ink }
});
