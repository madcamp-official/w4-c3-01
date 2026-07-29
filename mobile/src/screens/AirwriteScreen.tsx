// Ported from frontend/src/pages/AirwritePage.tsx — keep in sync.
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AirDrawingWebView, { type AirDrawingCapture } from '@/components/AirDrawingWebView';
import SketchyButton from '@/components/SketchyButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 220, height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.paper2 }}>
            <Image source={{ uri: preview.image }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
        </View>
        <View style={{ padding: 20, gap: 10 }}>
          <SketchyButton variant="primary" blobVariant="a" disabled={sending} onPress={handleSend}>
            <Text style={common.btnPrimaryText}>{sending ? '보내는 중...' : '이 메시지 보내기'}</Text>
          </SketchyButton>
          <SketchyButton variant="ghost" blobVariant="b" disabled={sending} onPress={() => setPreview(null)}>
            <Text style={common.btnGhostText}>다시 그리기</Text>
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
