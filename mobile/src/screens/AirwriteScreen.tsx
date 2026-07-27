// Ported from frontend/src/pages/AirwritePage.tsx — keep in sync.
import AirDrawingWebView, { type AirDrawingCapture } from '@/components/AirDrawingWebView';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

type Props = NativeStackScreenProps<AppStackParamList, 'Airwrite'>;

export default function AirwriteScreen({ navigation, route }: Props) {
  const { chatId } = route.params;
  const { sendAir } = useAppState();
  const { showToast } = useToast();

  async function handleCapture(capture: AirDrawingCapture) {
    try {
      await sendAir(chatId, capture.image, capture.strokes);
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '메시지를 보내지 못했어요');
    }
  }

  return (
    <AirDrawingWebView
      mode="message"
      outputSize={260}
      onClose={() => navigation.goBack()}
      onCapture={handleCapture}
      onError={(message) => showToast(message)}
    />
  );
}
