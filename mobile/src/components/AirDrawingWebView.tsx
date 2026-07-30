// The RN side of the bridge protocol defined in frontend/airview/bridge.ts —
// keep both in sync. Renders the air-drawing WebView bundle (built via
// `npm run build:airview` in frontend/, uploaded via `npm run upload:airview`
// to the public `air-drawing-webview` Supabase Storage bucket) and turns its
// postMessage events into onCapture/onClose/onError callbacks.
//
// The bundle is downloaded to local storage on first use and cached there
// (see ensureBundleCached below), then served from an on-device HTTP server
// (@dr.pogodin/react-native-static-server) at http://127.0.0.1:<port> — a
// real secure-context HTTP origin, so getUserMedia and fetch() for the WASM
// binary both work normally (unlike file://, which passes the getUserMedia
// check but Android WebView can't fetch() large binaries through — see the
// plan D6 write-up). No dev machine, cable, or adb involved, and this is how
// it'll work in the final build too. Requires expo-dev-client (this native
// module isn't available in plain Expo Go).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import StaticServer from '@dr.pogodin/react-native-static-server';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { AirDrawingDocument } from '@/air-drawing-types';
import type { StrokePoint } from '@/types';
import { colors } from '@/theme/colors';
import { decode } from 'base64-arraybuffer';

export type AirDrawingMode = 'post' | 'lounge' | 'heart' | 'message';

export interface AirDrawingCapture {
  image: string;
  video?: string;
  strokes: StrokePoint[];
  drawing: AirDrawingDocument;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const REMOTE_BASE = `${SUPABASE_URL}/storage/v1/object/public/air-drawing-webview`;

// Mirrors what frontend/scripts/prepare-airview-assets.mjs + upload-airview-bundle.mjs
// produce/upload. vision_wasm_module_internal.* is intentionally not shipped (unused).
const BUNDLE_FILES = [
  'index.html',
  'wasm/vision_wasm_internal.js',
  'wasm/vision_wasm_internal.wasm',
  'wasm/vision_wasm_nosimd_internal.js',
  'wasm/vision_wasm_nosimd_internal.wasm',
  'models/hand_landmarker.task'
];

/** Best-effort remote version check — returns null if unreachable (offline), so a cached bundle can still be used. */
async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${REMOTE_BASE}/version.txt?t=${Date.now()}`);
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}

/**
 * Downloads the bundle into the app's document directory on first use, and
 * re-downloads it whenever the uploaded version.txt marker changes (each
 * `npm run upload:airview` bumps it) — otherwise reuses the local cache.
 * Returns the local directory's plain filesystem path (no file:// prefix —
 * that's what StaticServer's fileDir expects).
 */
async function ensureBundleCached(onProgress: (done: number, total: number) => void): Promise<string> {
  if (!SUPABASE_URL) throw new Error('Supabase가 설정되지 않았어요');

  const rootDir = new Directory(Paths.document, 'air-drawing-webview');
  const indexFile = new File(rootDir, 'index.html');
  const versionFile = new File(rootDir, '.version');

  const remoteVersion = await fetchRemoteVersion();
  const localVersion = versionFile.exists ? versionFile.textSync() : null;
  const upToDate = indexFile.exists && remoteVersion !== null && remoteVersion === localVersion;
  console.log('[airview] cached:', indexFile.exists, 'localVersion:', localVersion, 'remoteVersion:', remoteVersion, 'upToDate:', upToDate);

  if (upToDate) {
    onProgress(BUNDLE_FILES.length, BUNDLE_FILES.length);
  } else if (indexFile.exists && remoteVersion === null) {
    // Offline but we have *something* cached — use it rather than failing outright.
    onProgress(BUNDLE_FILES.length, BUNDLE_FILES.length);
  } else {
    if (rootDir.exists) rootDir.delete();
    rootDir.create({ intermediates: true });
    for (const sub of ['wasm', 'models']) {
      new Directory(rootDir, sub).create({ intermediates: true });
    }

    let done = 0;
    for (const rel of BUNDLE_FILES) {
      const versionQuery = encodeURIComponent(remoteVersion ?? String(Date.now()));
      const remoteUrl = `${REMOTE_BASE}/${rel}?v=${versionQuery}`;
      console.log('[airview] downloading', remoteUrl);
      const dest = new File(rootDir, rel);
      await File.downloadFileAsync(remoteUrl, dest, { idempotent: true });
      console.log('[airview] done', rel, dest.size, 'bytes');
      done += 1;
      onProgress(done, BUNDLE_FILES.length);
    }
    if (remoteVersion !== null) versionFile.create({ overwrite: true });
    if (remoteVersion !== null) versionFile.write(remoteVersion);
  }
  return rootDir.uri.replace(/^file:\/\//, '');
}

// A single on-device server is reused across every AirDrawingWebView mount
// (Camera/EditHeart/Onboarding/.../Airwrite screens) instead of starting a
// fresh one each time, so repeat visits skip straight to "ready".
let serverOriginPromise: Promise<string> | null = null;

async function getServerOrigin(onProgress: (done: number, total: number) => void): Promise<string> {
  if (!serverOriginPromise) {
    serverOriginPromise = (async () => {
      const fileDir = await ensureBundleCached(onProgress);
      console.log('[airview] bundle cached at', fileDir, '- starting server');
      const server = new StaticServer({ fileDir });
      const result = await server.start();
      console.log('[airview] server started at', result);
      return result;
    })().catch((err) => {
      console.log('[airview] getServerOrigin failed:', err instanceof Error ? err.message : String(err));
      serverOriginPromise = null; // allow retrying on failure
      throw err;
    });
  }
  return serverOriginPromise;
}

type AirViewToNativeMessage =
  | { type: 'ready' }
  | { type: 'status'; status: string }
  | { type: 'capture'; payload: AirDrawingCapture }
  | { type: 'close' }
  | { type: 'home' }
  | { type: 'error'; message: string };

interface AirDrawingWebViewProps {
  mode: AirDrawingMode;
  outputSize?: number;
  maxDim?: number;
  /** True while the parent is saving the last capture — shows a blocking spinner over the WebView. */
  busy?: boolean;
  onCapture: (capture: AirDrawingCapture) => void;
  onClose: () => void;
  onHome?: () => void;
  widgetEntry?: boolean;
  onError?: (message: string) => void;
}

function buildAirViewUrl(origin: string, mode: AirDrawingMode, outputSize?: number, maxDim?: number, widgetEntry?: boolean, safeTop = 0, safeBottom = 0): string {
  const params = new URLSearchParams({ mode });
  if (outputSize) params.set('outputSize', String(outputSize));
  if (maxDim) params.set('maxDim', String(maxDim));
  if (widgetEntry) params.set('widgetEntry', '1');
  params.set('safeTop', String(Math.round(safeTop)));
  params.set('safeBottom', String(Math.round(safeBottom)));
  return `${origin}/index.html?${params.toString()}`;
}

export default function AirDrawingWebView({ mode, outputSize, maxDim, busy, onCapture, onClose, onHome, widgetEntry, onError }: AirDrawingWebViewProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const requestedRef = useRef(false);
  const [retryTick, setRetryTick] = useState(0);

  const ensurePermission = useCallback(async () => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    if (!permission?.granted) await requestPermission();
    setPermissionChecked(true);
  }, [permission, requestPermission]);

  useEffect(() => {
    void ensurePermission();
  }, [ensurePermission]);

  useEffect(() => {
    if (!permissionChecked || !permission?.granted) return;
    let cancelled = false;
    setBundleError(null);
    setProgress({ done: 0, total: BUNDLE_FILES.length });
    getServerOrigin((done, total) => {
      if (!cancelled) setProgress({ done, total });
    })
      .then((resolvedOrigin) => {
        if (!cancelled) setOrigin(resolvedOrigin);
      })
      .catch((err) => {
        if (!cancelled) setBundleError(err instanceof Error ? err.message : '준비하지 못했어요');
      });
    return () => {
      cancelled = true;
    };
  }, [permissionChecked, permission?.granted, retryTick]);

  if (!permissionChecked) {
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
          <Icon name="x" size={22} color={colors.paper} />
        </Pressable>
      </View>
    );
  }

  if (bundleError) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>손 추적 기능을 준비하지 못했어요.{'\n'}인터넷 연결을 확인해주세요.</Text>
        <Text style={[styles.centerText, { fontSize: 11, opacity: 0.7 }]}>{bundleError}</Text>
        <Pressable
          style={[styles.closeBtn, { width: 'auto', paddingHorizontal: 16 }]}
          onPress={() => {
            setBundleError(null);
            setRetryTick((t) => t + 1);
          }}
        >
          <Text style={{ color: colors.paper, fontSize: 13 }}>다시 시도</Text>
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Icon name="x" size={22} color={colors.paper} />
        </Pressable>
      </View>
    );
  }

  if (!origin) {
    const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.paper} />
        <Text style={styles.centerText}>손 추적 기능 준비 중... {pct}%{'\n'}(처음 한 번만 받으면 다음부터는 바로 열려요)</Text>
      </View>
    );
  }

  async function persistVideoDataUrl(dataUrl: string): Promise<string> {
    const base64 = dataUrl.split(',')[1];
    if (!base64) throw new Error('영상 데이터를 읽지 못했어요');
    const file = new File(Paths.cache, `air-video-${Date.now()}.webm`);
    file.create({ overwrite: true });
    file.write(new Uint8Array(decode(base64)));
    return file.uri;
  }

  async function handleMessage(event: WebViewMessageEvent) {
    let message: AirViewToNativeMessage;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    switch (message.type) {
      case 'ready':
        setWebviewLoading(false);
        break;
      case 'capture':
        if (message.payload.video) {
          try {
            onCapture({
              ...message.payload,
              video: await persistVideoDataUrl(message.payload.video),
            });
          } catch (error) {
            onError?.(error instanceof Error ? error.message : '영상을 저장하지 못했어요');
          }
        } else {
          onCapture(message.payload);
        }
        break;
      case 'close':
        onClose();
        break;
      case 'home':
        onHome?.();
        break;
      case 'error':
        onError?.(message.message);
        break;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        source={{ uri: buildAirViewUrl(origin, mode, outputSize, maxDim, widgetEntry, insets.top, insets.bottom) }}
        style={{ flex: 1 }}
        onMessage={handleMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        onError={(e) => onError?.(`WebView 로딩 실패: ${e.nativeEvent.description}`)}
        onHttpError={(e) => onError?.(`WebView HTTP 에러: ${e.nativeEvent.statusCode}`)}
      />
      {webviewLoading || busy ? (
        <View style={styles.loadingOverlay} pointerEvents={busy ? 'auto' : 'none'}>
          <ActivityIndicator color={colors.paper} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  centerText: { color: colors.paper, fontSize: 14, textAlign: 'center' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000'
  }
});
