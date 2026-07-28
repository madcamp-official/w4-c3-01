import { ViroARSceneNavigator } from '@reactvision/react-viro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  addSpatialContent,
  deleteMySpatialContents,
  fetchSpatialContents,
  fetchSpatialLounge,
  subscribeToLoungePresence,
  subscribeToSpatialContents,
} from '@/api/spatialLoungeApi';
import {
  QrSpatialLoungeScene,
  type QrSpatialSceneAppProps,
} from '@/features/lounge/QrSpatialLoungeScene';
import type {
  SpatialLounge,
  SpatialLoungeContent,
  SpatialStrokePoint,
} from '@/features/lounge/spatialTypes';
import { useAppState } from '@/state/AppStateContext';
import { colors } from '@/theme/colors';

const LOUNGE_ID = 'lounge-cafe-01';
const DRAWING_COLORS = [colors.ink, colors.accent, colors.line, '#FFFFFF'] as const;

export default function LoungeListScreen() {
  const { session } = useAppState();
  const [lounge, setLounge] = useState<SpatialLounge | null>(null);
  const [contents, setContents] = useState<SpatialLoungeContent[]>([]);
  const [alignRevision, setAlignRevision] = useState(0);
  const [aligned, setAligned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState<(typeof DRAWING_COLORS)[number]>(DRAWING_COLORS[0]);
  const [width, setWidth] = useState(8);
  const [onlineCount, setOnlineCount] = useState(1);

  const refresh = useCallback(async () => {
    try {
      const nextContents = await fetchSpatialContents(LOUNGE_ID);
      setContents(nextContents);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : '낙서를 불러오지 못했어요.');
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([fetchSpatialLounge(LOUNGE_ID), fetchSpatialContents(LOUNGE_ID)])
      .then(([nextLounge, nextContents]) => {
        if (!active) return;
        setLounge(nextLounge);
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
  }, [session]);

  useEffect(() => {
    if (!session) return;
    return subscribeToSpatialContents(LOUNGE_ID, () => void refresh());
  }, [refresh, session]);

  useEffect(() => {
    if (!session) return;
    return subscribeToLoungePresence(LOUNGE_ID, session.id, setOnlineCount);
  }, [session]);

  const finishStroke = useCallback(
    async (points: SpatialStrokePoint[]) => {
      if (!session || points.length < 2) return;
      const createdAt = new Date().toISOString();
      const content: SpatialLoungeContent = {
        lounge_id: LOUNGE_ID,
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

      try {
        setSaving(true);
        const saved = await addSpatialContent(content, session.id);
        setContents((current) => [
          saved,
          ...current.filter((item) => item.content_id !== saved.content_id),
        ]);
      } catch (saveError) {
        Alert.alert(
          '낙서를 저장하지 못했어요',
          saveError instanceof Error ? saveError.message : '네트워크 연결을 확인해 주세요.',
        );
      } finally {
        setSaving(false);
      }
    },
    [color, session, width],
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
    if (!session || mineCount === 0 || deleting) return;
    Alert.alert(
      '내 낙서를 전체 삭제할까요?',
      `이 라운지에 내가 남긴 낙서 ${mineCount}개가 모두 삭제됩니다. 다른 사람의 낙서는 유지됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            void deleteMySpatialContents(LOUNGE_ID, session.id)
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
          },
        },
      ],
    );
  }, [deleting, mineCount, session]);

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

  if (!session) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>로그인 후 라운지에 입장할 수 있어요.</Text>
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
            <Text style={styles.eyebrow}>ALINE · LIVE AR LOUNGE</Text>
            <Text numberOfLines={1} style={styles.loungeName}>
              {lounge?.name ?? '성수 카페 라운지'}
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

        <View style={styles.controls}>
          {!aligned ? (
            <Pressable onPress={alignQr} style={styles.alignButton}>
              <Text style={styles.alignButtonText}>정렬 완료 · 원점 설정</Text>
            </Pressable>
          ) : (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusText}>
                  {saving ? '동기화 중…' : `공유 낙서 ${strokeCount}개`}
                </Text>
                <Pressable
                  onPress={() => {
                    setDrawing(false);
                    setAligned(false);
                  }}>
                  <Text style={styles.realignText}>QR 다시 맞추기</Text>
                </Pressable>
              </View>

              <View style={styles.toolRow}>
                <View style={styles.colorRow}>
                  {DRAWING_COLORS.map((item) => (
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
                <View style={styles.widthControl}>
                  <Pressable
                    onPress={() => setWidth((value) => Math.max(4, value - 2))}
                    style={styles.widthButton}>
                    <Text style={styles.widthButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.widthText}>{width}</Text>
                  <Pressable
                    onPress={() => setWidth((value) => Math.min(20, value + 2))}
                    style={styles.widthButton}>
                    <Text style={styles.widthButtonText}>＋</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPressIn={() => setDrawing(true)}
                onPressOut={() => setDrawing(false)}
                style={({ pressed }) => [
                  styles.drawButton,
                  { backgroundColor: color === '#FFFFFF' ? colors.paper2 : color },
                  (pressed || drawing) && styles.pressedButton,
                ]}>
                <Text style={[styles.drawButtonText, color === colors.ink && styles.lightText]}>
                  누르고 움직여서 그리기
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
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
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
  },
  header: {
    marginHorizontal: 14,
    marginTop: 8,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.93)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  loungeName: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 2 },
  online: { color: colors.inkSoft, fontSize: 11, fontWeight: '700', marginTop: 3 },
  deleteButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.paper,
  },
  deleteButtonText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
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
  },
  guideDescription: {
    color: colors.paper,
    fontSize: 11,
    marginTop: 5,
    marginBottom: 16,
    textShadowColor: 'rgba(34,31,26,0.95)',
    textShadowRadius: 6,
  },
  qrGuide: { width: 220, height: 220 },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: colors.paper,
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  crossHorizontal: {
    position: 'absolute',
    width: 28,
    height: 2,
    backgroundColor: colors.accent,
    left: 96,
    top: 109,
  },
  crossVertical: {
    position: 'absolute',
    width: 2,
    height: 28,
    backgroundColor: colors.accent,
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
    backgroundColor: colors.accent,
  },
  reticleVertical: {
    position: 'absolute',
    left: 12,
    top: 0,
    width: 2,
    height: 26,
    backgroundColor: colors.accent,
  },
  controls: {
    margin: 14,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.94)',
    gap: 12,
  },
  alignButton: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  alignButtonText: { color: colors.paper, fontSize: 15, fontWeight: '900' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  realignText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  toolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selectedColor: { borderWidth: 3, borderColor: colors.accent },
  widthControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  widthButton: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper2,
  },
  widthButtonText: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  widthText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 18,
    textAlign: 'center',
  },
  drawButton: {
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  drawButtonText: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  lightText: { color: colors.paper },
});
