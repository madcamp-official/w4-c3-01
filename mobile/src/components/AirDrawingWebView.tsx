// The RN side of the bridge protocol defined in frontend/airview/bridge.ts —
// keep both in sync. Renders the air-drawing WebView bundle (built via
// `npm run build:airview` in frontend/, see mobile/assets/air-drawing-webview/)
// and turns its postMessage events into onCapture/onClose/onError callbacks.
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import Feather from '@expo/vector-icons/Feather';
import type { AirDrawingDocument } from '@/air-drawing-types';
import type { StrokePoint } from '@/types';
import { colors } from '@/theme/colors';

export type AirDrawingMode = 'post' | 'lounge' | 'heart' | 'message';

export interface AirDrawingCapture {
  image: string;
  strokes: StrokePoint[];
  drawing: AirDrawingDocument;
}

// DEV ONLY: points at `npx serve mobile/assets/air-drawing-webview -p 8788`
// running on the dev machine, reached via `adb reverse tcp:8788 tcp:8788` so
// the WebView sees it as `localhost` (a secure context — plain LAN IP over
// HTTP is not, which is why getUserMedia was blocked before this). Swap for
// the shipping origin strategy (file:// or an on-device static server)
// before release — see the TODO at the bottom of this file.
const DEV_SERVER_URL = 'http://localhost:8788';

type AirViewToNativeMessage =
  | { type: 'ready' }
  | { type: 'status'; status: string }
  | { type: 'capture'; payload: AirDrawingCapture }
  | { type: 'close' }
  | { type: 'error'; message: string };

interface AirDrawingWebViewProps {
  mode: AirDrawingMode;
  outputSize?: number;
  maxDim?: number;
  /** True while the parent is saving the last capture — shows a blocking spinner over the WebView. */
  busy?: boolean;
  onCapture: (capture: AirDrawingCapture) => void;
  onClose: () => void;
  onError?: (message: string) => void;
}

const INJECTED_BEFORE_LOAD = (mode: AirDrawingMode, outputSize?: number, maxDim?: number) => `
  window.__AIR_CONFIG__ = ${JSON.stringify({ mode, outputSize, maxDim })};
  true;
`;

export default function AirDrawingWebView({ mode, outputSize, maxDim, busy, onCapture, onClose, onError }: AirDrawingWebViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestedRef = useRef(false);

  const ensurePermission = useCallback(async () => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    if (!permission?.granted) await requestPermission();
    setPermissionChecked(true);
  }, [permission, requestPermission]);

  if (!permissionChecked) {
    void ensurePermission();
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.paper} />
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>카메라 권한이 필요해요.</Text>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Feather name="x" size={22} color={colors.paper} />
        </Pressable>
      </View>
    );
  }

  function handleMessage(event: WebViewMessageEvent) {
    let message: AirViewToNativeMessage;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    switch (message.type) {
      case 'ready':
        setLoading(false);
        break;
      case 'capture':
        onCapture(message.payload);
        break;
      case 'close':
        onClose();
        break;
      case 'error':
        onError?.(message.message);
        break;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        source={{ uri: DEV_SERVER_URL }}
        style={{ flex: 1 }}
        injectedJavaScriptBeforeContentLoaded={INJECTED_BEFORE_LOAD(mode, outputSize, maxDim)}
        onMessage={handleMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        onError={(e) => onError?.(`WebView 로딩 실패: ${e.nativeEvent.description}`)}
        onHttpError={(e) => onError?.(`WebView HTTP 에러: ${e.nativeEvent.statusCode}`)}
      />
      {loading || busy ? (
        <View style={styles.loadingOverlay} pointerEvents={busy ? 'auto' : 'none'}>
          <ActivityIndicator color={colors.paper} />
        </View>
      ) : null}
    </View>
  );
}

// TODO(Phase 4 shipping): DEV_SERVER_URL only works while the dev machine's
// static server is reachable on the same network. Before a real build,
// switch to either:
//  (a) file:///android_asset/air-drawing-webview/index.html — try first,
//      needs the bundle copied into the native Android assets folder.
//  (b) an on-device static server (@dr.pogodin/react-native-static-server)
//      serving from FileSystem.documentDirectory, requires expo-dev-client.
// See plan D6 for the full decision tree.

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
  centerText: { color: colors.paper, fontSize: 14 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }
});
