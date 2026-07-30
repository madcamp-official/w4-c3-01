// Ported from frontend/src/pages/PreviewPage.tsx — keep in sync.
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import SketchyButton from '@/components/SketchyButton';
import SketchyInput from '@/components/SketchyInput';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { usePlacement } from '@/state/PlacementContext';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';

type Props = NativeStackScreenProps<AppStackParamList, 'Preview'>;

export default function PreviewScreen({ navigation, route }: Props) {
  const { image, strokes, drawing, intent, editPostId, caption: initialCaption } = route.params;
  const isEditing = !!editPostId;
  const { sharePost, editPost } = useAppState();
  const { startPlacing } = usePlacement();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();
  const { showToast } = useToast();
  const [caption, setCaption] = useState(initialCaption ?? '');
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (isEditing) {
      setSharing(true);
      try {
        await editPost(editPostId, caption.trim());
        showToast('게시물을 수정했어요');
        navigation.goBack();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '게시물을 수정하지 못했어요');
      } finally {
        setSharing(false);
      }
      return;
    }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View
          style={
            // Post captures are always square (the camera crops to a square
            // before this screen ever sees it) — sizing the card to that
            // same aspect ratio, instead of stretching it to fill the whole
            // flex:1 area, means the image fills it exactly with nothing to
            // crop ("cover") or letterbox ("contain"): what's shown here is
            // pixel-for-pixel what gets uploaded. Lounge captures aren't
            // square, so they keep the old fill-the-space + letterbox framing.
            intent.kind === 'post'
              ? { width: '100%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.paper2 }
              : { flex: 1, alignSelf: 'stretch', margin: 16, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.paper2 }
          }
        >
          <Image source={{ uri: image }} style={{ flex: 1 }} resizeMode={intent.kind === 'post' ? 'cover' : 'contain'} />
          <Pressable
            style={{ position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 + bottomInset }}>
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
          <Text style={common.btnPrimaryText}>
            {isEditing
              ? sharing
                ? '수정하는 중...'
                : '수정하기'
              : intent.kind === 'lounge'
                ? '이 자리에 배치하기'
                : sharing
                  ? '공유하는 중...'
                  : '공유하기'}
          </Text>
        </SketchyButton>
      </View>
    </SafeAreaView>
  );
}
