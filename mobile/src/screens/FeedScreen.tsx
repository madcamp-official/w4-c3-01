// Placeholder for Phase 2 — real feed (FlatList + PostCard) comes next.
// Exists now purely so Phase 1's auth loop is end-to-end testable.
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '@/state/AppStateContext';
import { common } from '@/theme/common';

export default function FeedScreen() {
  const { session, logoutUser } = useAppState();

  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={common.title}>손끝에 오신 걸 환영해요, {session?.nickname}님</Text>
        <Text style={common.subtitle}>피드 화면은 Phase 2에서 구현됩니다.</Text>
        <Pressable style={[common.btn, common.btnGhost]} onPress={logoutUser}>
          <Text style={common.btnGhostText}>로그아웃</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
