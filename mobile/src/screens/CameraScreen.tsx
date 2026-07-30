// Ported from frontend/src/pages/CameraPage.tsx — keep in sync.
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AirDrawingWebView, { type AirDrawingCapture } from '@/components/AirDrawingWebView';
import type { AppStackParamList } from '@/navigation/types';
import { useToast } from '@/state/ToastContext';

type Props = NativeStackScreenProps<AppStackParamList, 'Camera'>;

export default function CameraScreen({ navigation, route }: Props) {
  const { showToast } = useToast();
  const [cameraReady, setCameraReady] = useState(false);
  const intent = route.params?.intent ?? { kind: 'post' as const };
  const fromWidget = route.params?.source === 'widget';

  useEffect(() => {
    // Releasing a native camera preview can finish after navigation on some
    // Android devices. Give Lounge's CameraView/Viro preview time to close.
    const timer = setTimeout(() => setCameraReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // replace (not navigate/goBack->push) so this screen — and the WebView
  // holding the camera — actually unmounts instead of staying alive under
  // the next screen (React Navigation keeps stack screens mounted by
  // default), which was leaving the camera locked for the next air-drawing
  // screen to open.
  function handleClose() {
    if (intent.kind === 'lounge') {
      navigation.replace('LoungeView', { loungeId: intent.loungeId });
    } else if (fromWidget) {
      navigation.replace('MainTabs');
    } else {
      navigation.goBack();
    }
  }

  function handleCapture(capture: AirDrawingCapture) {
    navigation.replace('Preview', { image: capture.image, video: capture.video, strokes: capture.strokes, drawing: capture.drawing, intent });
  }

  if (!cameraReady) {
    return <View style={styles.cameraReleaseScreen} />;
  }

  return (
    <AirDrawingWebView
      mode={intent.kind === 'lounge' ? 'lounge' : 'post'}
      widgetEntry={fromWidget}
      onClose={handleClose}
      onHome={() => navigation.replace('MainTabs')}
      onCapture={handleCapture}
      onError={(message) => showToast(message)}
    />
  );
}

const styles = StyleSheet.create({
  cameraReleaseScreen: {
    flex: 1,
    backgroundColor: '#000'
  }
});
