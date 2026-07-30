import { ViroARSceneNavigator } from '@reactvision/react-viro';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  addSpatialContent,
  deleteMySpatialContents,
  ensureSpatialLounge,
  fetchSpatialContents,
  subscribeToLoungePresence,
  subscribeToSpatialContents,
} from '@/api/spatialLoungeApi';
import {
  QrSpatialLoungeScene,
  LOUNGE_PALETTE,
  type QrSpatialSceneAppProps,
} from '@/features/lounge/QrSpatialLoungeScene';
import LineWidthSlider from '@/components/LineWidthSlider';
import Icon from '@/components/Icon';
import type { SpatialLoungeContent, SpatialStrokePoint } from '@/features/lounge/spatialTypes';
import { useAppState } from '@/state/AppStateContext';
// Deliberately static, not useTheme() — this is a fullscreen AR camera
// passthrough (like AirDrawingWebView.tsx): the dark screen backdrop and the
// light glass control panels overlaid on the live camera feed are fixed for
// legibility against an unpredictable camera image, independent of the app's
// light/dark toggle.
import { colors } from '@/theme/colors';

const LOUNGE_QR_PATTERN = /^ALine-([0-9]+)$/;
const MAX_LOUNGE_NUMBER_LENGTH = 58;

function loungeFromQr(data: string): { id: string; name: string } | null {
  const digits = data.trim().match(LOUNGE_QR_PATTERN)?.[1];
  if (!digits) return null;

  const normalizedNumber = digits.replace(/^0+(?=\d)/, '');
  if (normalizedNumber.length > MAX_LOUNGE_NUMBER_LENGTH) return null;

  return {
    id: `aline-${normalizedNumber}`,
    name: `ALine-${normalizedNumber}`,
  };
}

export default function LoungeListScreen() {
  const { session } = useAppState();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [loungeId, setLoungeId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [contents, setContents] = useState<SpatialLoungeContent[]>([]);
  const [alignRevision, setAlignRevision] = useState(0);
  const [aligned, setAligned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState<string>(LOUNGE_PALETTE[0]);
  const [width, setWidth] = useState(8);
  const [onlineCount, setOnlineCount] = useState(1);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const scanInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!loungeId) return;
    try {
      const nextContents = await fetchSpatialContents(loungeId);
      setContents(nextContents);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : '낙서를 불러오지 못했어요.');
    }
  }, [loungeId]);

  useEffect(() => {
    if (!session || !loungeId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchSpatialContents(loungeId)
      .then((nextContents) => {
        if (!active) return;
        setContents(nextContents);
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : '라운지를 열지 못했어요.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loungeId, session]);

  useEffect(() => {
    if (!session || !loungeId) return;
    return subscribeToSpatialContents(loungeId, () => void refresh());
  }, [loungeId, refresh, session]);

  useEffect(() => {
    if (!session || !loungeId) return;
    return subscribeToLoungePresence(loungeId, session.id, setOnlineCount);
  }, [loungeId, session]);

  const finishStroke = useCallback(
    async (points: SpatialStrokePoint[]) => {
      if (!session || !loungeId || points.length < 2) return;
      const createdAt = new Date().toISOString();
      const content: SpatialLoungeContent = {
        lounge_id: loungeId,
        content_id: `qr-${session.id.slice(0, 8)}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        user_id: session.id,
        user_name: session.nickname || session.username || '게스트',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
        },
        stroke_data: {
          version: 1,
          width: 1,
          height: 1,
          strokes: [{ color, width, points }],
        },
        surface: 'air',
        created_at: createdAt,
      };

      setContents((current) => [
        content,
        ...current.filter((item) => item.content_id !== content.content_id),
      ]);

      try {
        setSaving(true);
        const saved = await addSpatialContent(content, session.id);
        setContents((current) => [
          saved,
          ...current.filter((item) => item.content_id !== saved.content_id),
        ]);
      } catch (saveError) {
        setContents((current) =>
          current.filter((item) => item.content_id !== content.content_id),
        );
        Alert.alert(
          '낙서를 저장하지 못했어요',
          saveError instanceof Error ? saveError.message : '네트워크 연결을 확인해 주세요.',
        );
      } finally {
        setSaving(false);
      }
    },
    [color, loungeId, session, width],
  );

  const mineCount = useMemo(
    () => contents.filter((content) => content.user_id === session?.id).length,
    [contents, session?.id],
  );
  const strokeCount = useMemo(
    () =>
      contents.reduce(
        (total, content) => total + content.stroke_data.strokes.length,
        0,
      ),
    [contents],
  );

  const deleteMine = useCallback(() => {
    if (!session || !loungeId || mineCount === 0 || deleting) return;
    setDeleteConfirmOpen(true);
  }, [deleting, loungeId, mineCount, session]);

  const confirmDeleteMine = useCallback(() => {
    if (!session || !loungeId || mineCount === 0 || deleting) return;
    setDeleteConfirmOpen(false);
    setDeleting(true);
    void deleteMySpatialContents(loungeId, session.id)
      .then((deletedIds) => {
        const deletedIdSet = new Set(deletedIds);
        setContents((current) =>
          current.filter((content) => !deletedIdSet.has(content.content_id)),
        );
      })
      .catch((deleteError) => {
        Alert.alert(
          '삭제하지 못했어요',
          deleteError instanceof Error ? deleteError.message : '잠시 후 다시 시도해 주세요.',
        );
      })
      .finally(() => setDeleting(false));
  }, [deleting, loungeId, mineCount, session]);

  const viroAppProps = useMemo<QrSpatialSceneAppProps>(
    () => ({
      contents,
      alignRevision,
      drawing,
      color,
      width,
      onAligned: () => setAligned(true),
      onStrokeFinished: (points) => void finishStroke(points),
    }),
    [alignRevision, color, contents, drawing, finishStroke, width],
  );

  const alignQr = () => {
    setDrawing(false);
    setAligned(false);
    setAlignRevision((revision) => revision + 1);
  };

  const handleQrScanned = async ({ data }: BarcodeScanningResult) => {
    if (!session || scanInFlightRef.current) return;

    const scannedLounge = loungeFromQr(data);
    if (!scannedLounge) {
      setScanError('ALine-숫자 형식의 QR만 사용할 수 있어요.');
      return;
    }

    scanInFlightRef.current = true;
    setScanError('라운지를 확인하는 중…');
    try {
      await ensureSpatialLounge(scannedLounge.id, scannedLounge.name, session.id);
      setScanError(null);
      setContents([]);
      setOnlineCount(1);
      setLoungeId(scannedLounge.id);
    } catch (scanFailure) {
      setScanError(
        scanFailure instanceof Error
          ? scanFailure.message
          : '라운지를 열지 못했어요. 다시 시도해 주세요.',
      );
    } finally {
      scanInFlightRef.current = false;
    }
  };

  const scanAnotherQr = () => {
    setDrawing(false);
    setToolsOpen(false);
    setAligned(false);
    setContents([]);
    setError(null);
    setScanError(null);
    scanInFlightRef.current = false;
    setLoungeId(null);
  };

  if (!session) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>로그인 후 라운지에 입장할 수 있어요.</Text>
      </View>
    );
  }

  if (!loungeId) {
    if (!cameraPermission) {
      return (
        <View style={styles.loadingScreen}>
          <ActivityIndicator color={colors.ink} />
        </View>
      );
    }

    if (!cameraPermission.granted) {
      return (
        <View style={styles.permissionScreen}>
          <Icon name="qr-code" size={34} color="#101114" />
          <Text style={styles.permissionTitle}>라운지 QR을 스캔해 주세요</Text>
          <Text style={styles.permissionDescription}>
            ALine-숫자 형식의 QR만 라운지로 연결돼요.
          </Text>
          <Pressable onPress={() => void requestCameraPermission()} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>카메라 권한 허용</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.scannerScreen}>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          facing="back"
          onBarcodeScanned={handleQrScanned}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.scannerShade}>
          <SafeAreaView edges={['top']} style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>라운지 QR 스캔</Text>
            <Text style={styles.scannerSubtitle}>QR을 네 모서리 안에 맞춰주세요</Text>
          </SafeAreaView>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanError}>
            {scanError ?? 'ALine-숫자가 같은 QR은 같은 라운지로 연결돼요'}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.ink} />
        <Text style={styles.loadingText}>AR 라운지를 여는 중…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: QrSpatialLoungeScene }}
        style={StyleSheet.absoluteFill}
        viroAppProps={viroAppProps}
      />

      <SafeAreaView pointerEvents="box-none" edges={['top']} style={styles.overlay}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.loungeId}>
              {loungeId.replace(/^aline-/, 'ALine-')}
            </Text>
            <Text style={styles.online}>● {onlineCount}명 접속 중</Text>
          </View>
          <Pressable
            accessibilityLabel="내 낙서 전체 삭제"
            disabled={mineCount === 0 || deleting}
            onPress={deleteMine}
            style={({ pressed }) => [
              styles.deleteButton,
              (mineCount === 0 || deleting) && styles.disabledButton,
              pressed && styles.pressedButton,
            ]}>
            <Text style={styles.deleteButtonText}>
              {deleting ? '삭제 중…' : `내 낙서 삭제 ${mineCount}`}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Pressable style={styles.errorBanner} onPress={() => void refresh()}>
            <Text numberOfLines={2} style={styles.errorText}>
              {error} · 눌러서 다시 시도
            </Text>
          </Pressable>
        ) : null}

        {!aligned ? (
          <View pointerEvents="none" style={styles.guideArea}>
            <Text style={styles.guideTitle}>QR을 가이드에 맞춰주세요</Text>
            <Text style={styles.guideDescription}>QR의 바깥 테두리를 네 모서리에 맞춥니다</Text>
            <View style={styles.qrGuide}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.crossHorizontal} />
              <View style={styles.crossVertical} />
            </View>
          </View>
        ) : (
          <View pointerEvents="none" style={styles.reticle}>
            <View style={styles.reticleHorizontal} />
            <View style={styles.reticleVertical} />
          </View>
        )}

        {aligned ? (
          <View style={styles.toolsDock}>
            <Pressable
              accessibilityLabel={toolsOpen ? '펜 설정 닫기' : '펜 설정 열기'}
              onPress={() => setToolsOpen((current) => !current)}
              style={({ pressed }) => [
                styles.toolsToggle,
                pressed && styles.pressedButton,
              ]}>
              <View style={[styles.toolsToggleColor, { backgroundColor: color }]} />
              <View
                style={[
                  styles.toolsToggleSize,
                  {
                    width: Math.max(5, width),
                    height: Math.max(5, width),
                    borderRadius: Math.max(3, width / 2),
                  },
                ]}
              />
            </Pressable>

            {toolsOpen ? (
              <View style={styles.toolsPopover}>
                <View style={styles.colorGrid}>
                  {LOUNGE_PALETTE.slice(0, 5).map(
                    (item, rowIndex) => (
                      <View key={rowIndex} style={styles.colorRow}>
                        {[item, LOUNGE_PALETTE[rowIndex + 5]].map((item) => (
                          <Pressable
                            key={item}
                            accessibilityLabel={`펜 색상 ${item}`}
                            onPress={() => setColor(item)}
                            style={[
                              styles.colorButton,
                              { backgroundColor: item },
                              color === item && styles.selectedColor,
                            ]}
                          />
                        ))}
                      </View>
                    ),
                  )}
                </View>
                <LineWidthSlider
                  compact
                  value={width}
                  onValueChange={setWidth}
                  variant="dark"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.controls}>
          {!aligned ? (
            <Pressable onPress={alignQr} style={styles.alignButton}>
              <Text style={styles.alignButtonText}>원점 설정</Text>
            </Pressable>
          ) : (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusText}>
                  {saving ? '동기화 중…' : `공유 낙서 ${strokeCount}개`}
                </Text>
                <Pressable
                  onPress={scanAnotherQr}>
                  <Text style={styles.realignText}>QR 다시 맞추기</Text>
                </Pressable>
              </View>

              <View style={styles.toolRow}>
                <View style={styles.colorRow}>
                  {LOUNGE_PALETTE.map((item) => (
                    <Pressable
                      key={item}
                      accessibilityLabel={`낙서 색상 ${item}`}
                      onPress={() => setColor(item)}
                      style={[
                        styles.colorButton,
                        { backgroundColor: item },
                        color === item && styles.selectedColor,
                      ]}
                    />
                  ))}
                </View>
                <LineWidthSlider value={width} onValueChange={setWidth} variant="dark" />
              </View>

              <View style={styles.capturePanel}>
                <Pressable
                  accessibilityLabel="내 낙서 전체 삭제"
                  disabled={mineCount === 0 || deleting}
                  onPress={deleteMine}
                  style={({ pressed }) => [
                    styles.sideActionButton,
                    (mineCount === 0 || deleting) && styles.disabledButton,
                    pressed && styles.pressedButton,
                  ]}>
                  <Icon name="trash-2" size={22} color="#FFFFFF" />
                </Pressable>

                <Pressable
                  accessibilityLabel="그리기"
                  onPressIn={() => setDrawing(true)}
                  onPressOut={() => setDrawing(false)}
                  style={({ pressed }) => [
                    styles.drawButton,
                    (pressed || drawing) && styles.pressedButton,
                  ]}>
                  <View
                    style={[
                      styles.drawButtonInner,
                      { backgroundColor: color === '#FFFFFF' ? '#FFF7EF' : color },
                    ]}
                  />
                </Pressable>

                <Pressable
                  accessibilityLabel="QR 다시 맞추기"
                  onPress={scanAnotherQr}
                  style={({ pressed }) => [
                    styles.sideActionButton,
                    pressed && styles.pressedButton,
                  ]}>
                  <Icon name="qr-code" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={() => setDeleteConfirmOpen(false)}
        transparent
        visible={deleteConfirmOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalIcon}>
              <Icon name="trash-2" size={24} color="#FF7A8D" />
            </View>
            <Text style={styles.deleteModalTitle}>내 낙서를 전체 삭제할까요?</Text>
            <Text style={styles.deleteModalDescription}>
              이 라운지에 남긴 내 낙서 {mineCount}개가 삭제돼요.{'\n'}
              다른 사람의 낙서는 그대로 유지됩니다.
            </Text>
            <View style={styles.deleteModalActions}>
              <Pressable
                onPress={() => setDeleteConfirmOpen(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,
                  pressed && styles.pressedButton,
                ]}>
                <Text style={styles.modalCancelText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={confirmDeleteMine}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalDeleteButton,
                  pressed && styles.pressedButton,
                ]}>
                <Text style={styles.modalDeleteText}>전체 삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.paper,
  },
  loadingText: { color: colors.inkSoft, fontSize: 13, fontWeight: '600' },
  permissionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#FFF7EF',
  },
  permissionTitle: {
    marginTop: 16,
    color: '#101114',
    fontSize: 20,
    fontWeight: '900',
  },
  permissionDescription: {
    marginTop: 7,
    color: '#77716A',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionButton: {
    minWidth: 210,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: '#101114',
  },
  permissionButtonText: { color: '#FFF7EF', fontSize: 14, fontWeight: '900' },
  scannerScreen: { flex: 1, backgroundColor: '#050608' },
  scannerShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,3,5,0.28)',
  },
  scannerHeader: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    alignItems: 'center',
    paddingTop: 14,
  },
  scannerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  scannerSubtitle: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
  },
  scannerFrame: {
    width: 236,
    height: 236,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  scanError: {
    minHeight: 18,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,10,14,0.66)',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
  },
  header: {
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 4,
    paddingVertical: 5,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerCopy: { flex: 1 },
  loungeId: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  online: { color: '#78E5AC', fontSize: 9, fontWeight: '800', marginTop: 2 },
  deleteButton: {
    display: 'none',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,93,115,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,93,115,0.12)',
  },
  deleteButtonText: { color: '#FF8B9B', fontSize: 9, fontWeight: '800' },
  disabledButton: { opacity: 0.4 },
  pressedButton: { transform: [{ scale: 0.97 }], opacity: 0.82 },
  errorBanner: {
    position: 'absolute',
    top: 118,
    left: 28,
    right: 28,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(179,56,46,0.92)',
  },
  errorText: { color: colors.paper, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  guideArea: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  guideTitle: {
    color: colors.paper,
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(34,31,26,0.95)',
    textShadowRadius: 7,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(8,10,14,0.58)',
  },
  guideDescription: {
    color: colors.paper,
    fontSize: 11,
    marginTop: 5,
    marginBottom: 16,
    textShadowColor: 'rgba(34,31,26,0.95)',
    textShadowRadius: 6,
  },
  qrGuide: {
    width: 220,
    height: 220,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  crossHorizontal: {
    position: 'absolute',
    width: 28,
    height: 2,
    backgroundColor: '#FF5D73',
    left: 96,
    top: 109,
  },
  crossVertical: {
    position: 'absolute',
    width: 2,
    height: 28,
    backgroundColor: '#FF5D73',
    left: 109,
    top: 96,
  },
  reticle: {
    position: 'absolute',
    top: '47%',
    left: '50%',
    width: 26,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
  },
  reticleHorizontal: {
    position: 'absolute',
    left: 0,
    top: 12,
    width: 26,
    height: 2,
    backgroundColor: '#FF5D73',
  },
  reticleVertical: {
    position: 'absolute',
    left: 12,
    top: 0,
    width: 2,
    height: 26,
    backgroundColor: '#FF5D73',
  },
  controls: {
    marginHorizontal: 14,
    marginBottom: 20,
    padding: 4,
    alignItems: 'center',
    gap: 12,
  },
  alignButton: {
    minWidth: 250,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#101114',
    backgroundColor: '#FFF7EF',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  alignButtonText: { color: '#101114', fontSize: 15, fontWeight: '900' },
  statusRow: {
    display: 'none',
    minWidth: 230,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(8,10,14,0.58)',
  },
  statusText: { color: 'rgba(255,255,255,0.68)', fontSize: 10, fontWeight: '700' },
  realignText: { color: '#FF8B9B', fontSize: 10, fontWeight: '800' },
  toolRow: { display: 'none' },
  toolsDock: {
    position: 'absolute',
    left: 10,
    top: '33%',
    zIndex: 20,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  toolsToggle: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(8,10,14,0.68)',
  },
  toolsToggleColor: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  toolsToggleSize: { backgroundColor: '#FFFFFF' },
  toolsPopover: {
    width: 146,
    gap: 7,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(8,10,14,0.74)',
  },
  colorGrid: { alignItems: 'center', gap: 4 },
  colorRow: { flexDirection: 'row', gap: 7 },
  colorButton: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 0.86 }],
  },
  capturePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(7,9,13,0.72)',
    shadowColor: '#000000',
    shadowOpacity: 0.36,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  sideActionButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  drawButton: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.94)',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  drawButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(8,9,12,0.66)',
  },
  deleteModal: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(34,31,26,0.12)',
    backgroundColor: '#FFF7EF',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  deleteModalIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(255,93,115,0.12)',
  },
  deleteModalTitle: {
    color: '#101114',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  deleteModalDescription: {
    marginTop: 9,
    color: '#77716A',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
  },
  deleteModalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  modalButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(34,31,26,0.14)',
    backgroundColor: '#F5ECE3',
  },
  modalDeleteButton: { backgroundColor: '#101114' },
  modalCancelText: { color: '#4E4943', fontSize: 13, fontWeight: '800' },
  modalDeleteText: { color: '#FFF7EF', fontSize: 13, fontWeight: '900' },
});
