// Ported from frontend/src/components/ViewerOverlay.tsx — keep in sync
// (canvas replay -> StrokeReplay, window.confirm -> Alert).
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/Icon';
import SketchyButton from '@/components/SketchyButton';
import StrokeReplay from '@/components/StrokeReplay';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import { buildCommon } from '@/theme/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_SIZE = SCREEN_WIDTH - 40;

export default function ViewerOverlay() {
  const { viewer, closeViewer } = useOverlay();
  const { posts, deletePost } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const styles = makeStyles(colors);
  const [replayKey, setReplayKey] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const [sourceAspect, setSourceAspect] = useState(1);

  useEffect(() => {
    if (!viewer) return;
    // Strokes are normalized against the original (often non-square) capture
    // canvas, but the photo displays cropped to a square via resizeMode="cover" —
    // fetch the real image dimensions so the replay path can apply the same crop.
    Image.getSize(
      viewer.image,
      (w, h) => setSourceAspect(w / h),
      () => setSourceAspect(1)
    );
  }, [viewer]);

  if (!viewer) return null;

  const post = viewer.postId ? posts.find((p) => p.id === viewer.postId) : undefined;

  function handleReplay() {
    setReplaying(true);
    setReplayKey((k) => k + 1);
  }

  function handleDelete() {
    if (!post) return;
    Alert.alert('이 게시물을 삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deletePost(post.id);
          closeViewer();
        }
      }
    ]);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeViewer}>
      <View style={styles.overlay}>
        <View style={styles.top}>
          <Pressable style={styles.iconBtn} onPress={closeViewer}>
            {/* Fixed white, not colors.paper — this overlay's backdrop is
                always near-black regardless of app theme (see styles.overlay). */}
            <Icon name="x" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={[styles.media, { width: MEDIA_SIZE, height: MEDIA_SIZE }]}>
          <Image source={{ uri: viewer.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          {replaying && viewer.strokes ? (
            <StrokeReplay
              key={replayKey}
              strokes={viewer.strokes}
              width={MEDIA_SIZE}
              height={MEDIA_SIZE}
              sourceAspect={sourceAspect}
              onDone={() => setReplaying(false)}
            />
          ) : null}
        </View>
        <View style={styles.bottom}>
          <Text style={styles.caption}>{viewer.caption}</Text>
          {viewer.strokes ? (
            <SketchyButton variant="primary" onPress={handleReplay}>
              <Text style={common.btnPrimaryText}>✏️ 다시 쓰는 순간 보기</Text>
            </SketchyButton>
          ) : null}
          {post?.mine ? (
            <SketchyButton variant="ghost" style={{ marginTop: 8 }} onPress={handleDelete}>
              <Text style={[common.btnGhostText, { color: colors.danger }]}>삭제하기</Text>
            </SketchyButton>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(20,17,12,0.94)', alignItems: 'center', paddingTop: 50 },
    top: { width: '100%', paddingHorizontal: 16, flexDirection: 'row' },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    media: { marginTop: 16, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.paper2 },
    bottom: { width: MEDIA_SIZE, marginTop: 20 },
    caption: { color: '#fff', fontSize: 14, marginBottom: 14, textAlign: 'center' }
  });
}
