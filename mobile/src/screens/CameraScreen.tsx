// Ported from frontend/src/pages/CameraPage.tsx — keep in sync.
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AirDrawingWebView, { type AirDrawingCapture } from '@/components/AirDrawingWebView';
import type { AppStackParamList } from '@/navigation/types';
import { useToast } from '@/state/ToastContext';

type Props = NativeStackScreenProps<AppStackParamList, 'Camera'>;

export default function CameraScreen({ navigation, route }: Props) {
  const { showToast } = useToast();
  const intent = route.params?.intent ?? { kind: 'post' as const };

  // replace (not navigate/goBack->push) so this screen — and the WebView
  // holding the camera — actually unmounts instead of staying alive under
  // the next screen (React Navigation keeps stack screens mounted by
  // default), which was leaving the camera locked for the next air-drawing
  // screen to open.
  function handleClose() {
    if (intent.kind === 'lounge') {
      navigation.replace('LoungeView', { loungeId: intent.loungeId });
    } else {
      navigation.goBack();
    }
  }

  function handleCapture(capture: AirDrawingCapture) {
    navigation.replace('Preview', { image: capture.image, strokes: capture.strokes, drawing: capture.drawing, intent });
  }

  return (
    <AirDrawingWebView
      mode={intent.kind === 'lounge' ? 'lounge' : 'post'}
      onClose={handleClose}
      onCapture={handleCapture}
      onError={(message) => showToast(message)}
    />
  );
}
