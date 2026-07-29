// Ported from frontend/src/pages/AirwritePage.tsx — keep in sync. The
// preview step mirrors PreviewScreen.tsx's exact layout (full-bleed image
// card, back-chevron overlay, single bottom button) instead of its own
// bespoke minimal preview, so it reads the same as the post camera's.
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AirDrawingWebView, { type AirDrawingCapture } from '@/components/AirDrawingWebView';
import Icon from '@/components/Icon';
import SketchyButton from '@/components/SketchyButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';

type Props = NativeStackScreenProps<AppStackParamList, 'Airwrite'>;

export default function AirwriteScreen({ navigation, route }: Props) {
  const { chatId } = route.params;
  const { sendAir } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();
  const { showToast } = useToast();
  const [preview, setPreview] = useState<AirDrawingCapture | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!preview) return;
    setSending(true);
    try {
      await sendAir(chatId, preview.image, preview.strokes);
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '메시지를 보내지 못했어요');
      setSending(false);
    }
  }

  if (preview) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {/* Air-write captures are always square (outputSize) — see
              PreviewScreen.tsx's identical note on why this is sized to
              match instead of stretched to fill the flex:1 area. */}
          <View style={{ width: '100%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.paper2 }}>
            <Image source={{ uri: preview.image }} style={{ flex: 1 }} resizeMode="cover" />
            <Pressable
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.4)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onPress={() => setPreview(null)}
            >
              <Icon name="chevron-left" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 + bottomInset }}>
          <SketchyButton variant="primary" disabled={sending} onPress={handleSend}>
            <Text style={common.btnPrimaryText}>{sending ? '보내는 중...' : '이 메시지 보내기'}</Text>
          </SketchyButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AirDrawingWebView
      mode="message"
      // 260px는 채팅 말풍선(160px)엔 충분하지만 상세 뷰어(화면 너비 - 40, 고DPR
      // 기기에선 900px+)에선 크게 확대돼 흐릿해 보였다 — 게시물 캡처(최대
      // maxDim=2400)만큼 여유 있게 키워 업스케일 흐림을 없앤다.
      outputSize={960}
      onClose={() => navigation.goBack()}
      onCapture={(capture: AirDrawingCapture) => setPreview(capture)}
      onError={(message) => showToast(message)}
    />
  );
}
