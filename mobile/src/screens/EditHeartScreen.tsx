// Ported from frontend/src/pages/EditHeartPage.tsx — keep in sync.
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AirDrawingWebView, { type AirDrawingCapture } from '@/components/AirDrawingWebView';
import SketchyButton from '@/components/SketchyButton';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';

type Props = NativeStackScreenProps<AppStackParamList, 'EditHeart'>;

export default function EditHeartScreen({ navigation }: Props) {
  const { setHeart } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const { showToast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    try {
      await setHeart(preview);
      showToast('하트를 새로 그렸어요 🎉');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
      setSaving(false);
    }
  }

  if (preview) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 220, height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.paper2 }}>
            <Image source={{ uri: preview }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
        </View>
        <View style={{ padding: 20, gap: 10 }}>
          <SketchyButton variant="primary" blobVariant="a" disabled={saving} onPress={handleSave}>
            <Text style={common.btnPrimaryText}>{saving ? '저장하는 중...' : '이 하트로 저장'}</Text>
          </SketchyButton>
          <SketchyButton variant="ghost" blobVariant="b" disabled={saving} onPress={() => setPreview(null)}>
            <Text style={common.btnGhostText}>다시 그리기</Text>
          </SketchyButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AirDrawingWebView
      mode="heart"
      outputSize={220}
      onClose={() => navigation.goBack()}
      onCapture={(capture: AirDrawingCapture) => setPreview(capture.image)}
      onError={(message) => showToast(message)}
    />
  );
}
