// Ported from frontend/src/pages/PreviewPage.tsx — keep in sync.
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import SketchyButton from '@/components/SketchyButton';
import SketchyInput from '@/components/SketchyInput';
import type { AppStackParamList } from '@/navigation/types';
import { usePlacement } from '@/state/PlacementContext';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';

type Props = NativeStackScreenProps<AppStackParamList, 'Preview'>;

export default function PreviewScreen({ navigation, route }: Props) {
  const { image, strokes, drawing, intent } = route.params;
  const { sharePost } = useAppState();
  const { startPlacing } = usePlacement();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const { showToast } = useToast();
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (intent.kind === 'lounge') {
      startPlacing(image, strokes);
      navigation.navigate('LoungeView', { loungeId: intent.loungeId });
      return;
    }
    setSharing(true);
    try {
      await sharePost({ image, strokes, drawing, caption: caption.trim() });
      showToast('게시물을 공유했어요 🎉');
      navigation.navigate('MainTabs');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '게시물을 공유하지 못했어요');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', margin: 16, backgroundColor: '#000' }}>
        <Image source={{ uri: image }} style={{ flex: 1 }} resizeMode="cover" />
        <Pressable
          style={{ position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={22} color="#fff" />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        {intent.kind === 'post' ? (
          <SketchyInput
            style={{ marginBottom: 10 }}
            placeholder="문구를 남겨보세요..."
            maxLength={80}
            value={caption}
            onChangeText={setCaption}
          />
        ) : null}
        <SketchyButton variant="primary" disabled={sharing} onPress={handleShare}>
          <Text style={common.btnPrimaryText}>{intent.kind === 'lounge' ? '이 자리에 배치하기' : sharing ? '공유하는 중...' : '공유하기'}</Text>
        </SketchyButton>
      </View>
    </SafeAreaView>
  );
}
