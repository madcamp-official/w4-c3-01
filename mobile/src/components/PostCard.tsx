// Ported from frontend/src/components/PostCard.tsx — keep in sync. Compact
// list-mode card — see FeedScreen.tsx for the swipeable story-card mode (a
// separate renderer), both keep the post image 1:1 square.
import { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Avatar from '@/components/Avatar';
import LikeButton from '@/components/LikeButton';
import PostMenu from '@/components/PostMenu';
import StrokeReplay from '@/components/StrokeReplay';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import { radius as radiusTokens } from '@/theme/colors';
import type { Post } from '@/types';
import Icon from '@/components/Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Matches PostDetailScreen's own MEDIA_SIZE (SCREEN_WIDTH - 34px side inset
// on each side) since this card uses the same 34px horizontal margin.
const MEDIA_SIZE = SCREEN_WIDTH - 68;

export default function PostCard({ post, isLast }: { post: Post; isLast?: boolean }) {
  const { openShare } = useOverlay();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const [replaying, setReplaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [sourceAspect, setSourceAspect] = useState(1);
  const openComments = (postId: string) =>
    navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('Comment', { postId });
  const openEdit = () =>
    navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('Preview', {
      image: post.image,
      strokes: post.strokes,
      drawing: post.drawing,
      intent: { kind: 'post' },
      editPostId: post.id,
      caption: post.caption
    });
  const openProfile = () =>
    post.mine
      ? navigation.navigate('My')
      : navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('UserProfile', { userId: post.authorId });

  useEffect(() => {
    // Strokes are normalized against the original (often non-square) capture
    // canvas, but the photo displays cropped to a square via resizeMode="cover" —
    // fetch the real image dimensions so the replay path can apply the same crop.
    Image.getSize(
      post.image,
      (w, h) => setSourceAspect(w / h),
      () => setSourceAspect(1)
    );
  }, [post.image]);

  function handleReplay() {
    setReplaying(true);
    setReplayKey((k) => k + 1);
  }

  return (
    <View style={[styles.card, isLast && styles.cardLast]}>
      <View style={styles.headRow}>
        <Pressable style={styles.head} onPress={openProfile}>
          <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} avatarUrl={post.avatarUrl} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.time}>{post.time}</Text>
          </View>
        </Pressable>
        <PostMenu post={post} triggerStyle={styles.menuBtn} onEdit={openEdit} />
      </View>
      <Pressable
        style={[styles.mediaWrap, styles.mediaWrapRounded]}
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
        <Pressable onPress={() => openComments(post.id)} style={styles.actionBtn}>
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
          <Pressable onPress={() => openComments(post.id)}>
            <Text style={styles.time}>댓글 {post.comments.length}개 모두 보기</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    card: { paddingBottom: 18, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    cardLast: { borderBottomWidth: 0 },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 34 },
    head: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, flex: 1 },
    menuBtn: { padding: 6, marginRight: -6 },
    username: { fontWeight: '700', color: colors.ink, fontSize: 13.5 },
    time: { fontSize: 11, color: colors.inkSoft },
    mediaWrap: { width: '100%', aspectRatio: 1, backgroundColor: colors.paper2, overflow: 'hidden' },
    mediaWrapRounded: { borderRadius: 22, marginHorizontal: 34, width: undefined },
    actions: { flexDirection: 'row', gap: 16, paddingHorizontal: 34, paddingTop: 11, paddingBottom: 2 },
    actionBtn: { padding: 2 },
    meta: { paddingHorizontal: 34, paddingTop: 4, gap: 2, paddingBottom: 4 },
    likes: { fontWeight: '700', fontSize: 13, color: colors.ink },
    caption: { fontSize: 13, color: colors.ink }
  });
}
