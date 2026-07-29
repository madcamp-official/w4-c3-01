// Ported from frontend/src/pages/PostDetailPage.tsx — keep in sync. The
// single-post "permalink" screen — reached from the feed, profile/search
// grids, and shared-post chat messages. Replaces what those places used to
// do with ViewerOverlay (a bare image modal); this instead looks like an
// isolated PostCard (author, actions, caption) plus ViewerOverlay's old
// replay/delete behavior, now living here since only a real post needs them.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import LikeButton from '@/components/LikeButton';
import SketchyButton from '@/components/SketchyButton';
import StrokeReplay from '@/components/StrokeReplay';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import { buildCommon } from '@/theme/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Matches PostCard.tsx's own 34px side inset exactly (that card manages its
// own horizontal spacing rather than relying on a padded screen container,
// since it's used inside FeedScreen's unpadded list) — this screen used to
// rely on common.screen's 20px instead, so its spacing didn't match the
// feed's post cards it's meant to look like an isolated instance of.
const SIDE_INSET = 34;
const MEDIA_SIZE = SCREEN_WIDTH - SIDE_INSET * 2;

type Props = NativeStackScreenProps<AppStackParamList, 'PostDetail'>;

export default function PostDetailScreen({ navigation, route }: Props) {
  const { postId } = route.params;
  const { posts, loadPost, deletePost } = useAppState();
  const { openShare } = useOverlay();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();
  const styles = makeStyles(colors);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [sourceAspect, setSourceAspect] = useState(1);

  const post = posts.find((p) => p.id === postId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPost(postId).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    if (!post) return;
    // Strokes are normalized against the original (often non-square) capture
    // canvas, but the photo displays cropped to a square via resizeMode="cover" —
    // fetch the real image dimensions so the replay path can apply the same crop.
    Image.getSize(
      post.image,
      (w, h) => setSourceAspect(w / h),
      () => setSourceAspect(1)
    );
  }, [post?.image]);

  function openComments() {
    navigation.navigate('Comment', { postId });
  }

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
          navigation.goBack();
        }
      }
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </Pressable>
      </View>
      {!post ? (
        <View style={styles.centerFill}>
          {loading ? <ActivityIndicator color={colors.muted} /> : <Text style={common.subtitle}>게시물을 찾을 수 없어요</Text>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 + bottomInset }}>
          <Pressable
            style={styles.authorRow}
            onPress={() =>
              post.mine
                ? navigation.navigate('MainTabs', { screen: 'My' })
                : navigation.navigate('UserProfile', { userId: post.authorId })
            }
          >
            <Avatar nickname={post.username} color={post.avatarColor} size={34} fontSize={13} avatarUrl={post.avatarUrl} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.username}>{post.username}</Text>
              <Text style={styles.time}>{post.time}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.media}
            onPress={post.strokes.length ? handleReplay : undefined}
            disabled={post.strokes.length === 0}
          >
            <Image source={{ uri: post.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {replaying && post.strokes.length ? (
              <StrokeReplay
                key={replayKey}
                strokes={post.strokes}
                width={MEDIA_SIZE}
                height={MEDIA_SIZE}
                sourceAspect={sourceAspect}
                onDone={() => setReplaying(false)}
              />
            ) : null}
          </Pressable>
          <View style={styles.actions}>
            <LikeButton post={post} />
            <Pressable onPress={openComments} style={styles.actionBtn}>
              <Icon name="message-circle" size={22} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => openShare(post.id)} style={styles.actionBtn}>
              <Icon name="send" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.meta}>
            <Text style={styles.likes}>좋아요 {post.likes}개</Text>
            <Text style={styles.caption}>
              <Text style={styles.username}>{post.username} </Text>
              {post.caption}
            </Text>
            {post.comments.length ? (
              <Pressable onPress={openComments}>
                <Text style={styles.time}>댓글 {post.comments.length}개 모두 보기</Text>
              </Pressable>
            ) : null}
            {post.strokes.length ? (
              <SketchyButton variant="ghost" style={{ marginTop: 12 }} onPress={handleReplay}>
                <Text style={common.btnGhostText}>다시 쓰는 순간 보기</Text>
              </SketchyButton>
            ) : null}
            {post.mine ? (
              <SketchyButton variant="ghost" style={{ marginTop: 8 }} onPress={handleDelete}>
                <Text style={[common.btnGhostText, { color: colors.danger }]}>삭제하기</Text>
              </SketchyButton>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6 },
    backBtn: { width: 36, height: 36, justifyContent: 'center', marginLeft: -8 },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    // Everything below matches PostCard.tsx's own spacing exactly (head/
    // mediaWrapRounded/actions/meta) so this reads as an isolated instance
    // of the same card, not a differently-proportioned screen.
    authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIDE_INSET, paddingVertical: 12 },
    username: { fontWeight: '700', color: colors.ink, fontSize: 13.5 },
    time: { fontSize: 11, color: colors.inkSoft },
    media: { width: MEDIA_SIZE, height: MEDIA_SIZE, marginHorizontal: SIDE_INSET, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.paper2 },
    actions: { flexDirection: 'row', gap: 16, paddingHorizontal: SIDE_INSET, paddingTop: 11, paddingBottom: 2 },
    actionBtn: { padding: 2 },
    meta: { paddingHorizontal: SIDE_INSET, paddingTop: 4, gap: 2, paddingBottom: 4 },
    likes: { fontWeight: '700', fontSize: 13, color: colors.ink },
    caption: { fontSize: 13, color: colors.ink }
  });
}
