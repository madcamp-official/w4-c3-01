// Ported from frontend/src/components/PostCard.tsx — keep in sync. Used by the
// dual-mode feed (see FeedScreen.tsx): "horizontal" is one post per full page,
// "vertical" is a classic scrolling list — both keep the post image 1:1 square.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { colors } from '@/theme/colors';
import type { Post } from '@/types';

export default function PostCard({ post, variant = 'vertical' }: { post: Post; variant?: 'horizontal' | 'vertical' }) {
  const { session, likePost } = useAppState();
  const { openViewer, openComments, openShare } = useOverlay();

  // Mirrors global.css's .heart-icon/.liked/.pop + @keyframes heartpop:
  // pale+small by default, and on liking it overshoots to 1.4x before
  // settling at 1.15x while fading in to full opacity.
  const heartScale = useSharedValue(post.liked ? 1.15 : 1);
  const heartOpacity = useSharedValue(post.liked ? 1 : 0.5);
  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }]
  }));

  async function handleLike() {
    const willLike = !post.liked;
    await likePost(post.id);
    if (willLike) {
      heartScale.value = withSequence(
        withTiming(1.4, { duration: 180, easing: Easing.out(Easing.ease) }),
        withTiming(1.15, { duration: 220, easing: Easing.out(Easing.ease) })
      );
      heartOpacity.value = withTiming(1, { duration: 200 });
    } else {
      heartScale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
      heartOpacity.value = withTiming(0.5, { duration: 200 });
    }
  }

  return (
    <View style={variant === 'horizontal' ? styles.cardFill : styles.card}>
      <View style={styles.head}>
        <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} avatarUrl={post.avatarUrl} />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.time}>{post.time}</Text>
        </View>
      </View>
      <Pressable
        style={styles.mediaWrap}
        onPress={() => openViewer({ image: post.image, caption: post.caption, strokes: post.strokes, postId: post.id })}
      >
        <Image source={{ uri: post.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={handleLike} style={styles.actionBtn}>
          <Animated.View style={heartStyle}>
            {session?.heartUrl ? (
              <Image source={{ uri: session.heartUrl }} style={{ width: 22, height: 22 }} resizeMode="contain" />
            ) : (
              <Icon name="heart" size={22} color={colors.ink} />
            )}
          </Animated.View>
        </Pressable>
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

const styles = StyleSheet.create({
  card: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.paper2 },
  cardFill: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  username: { fontWeight: '700', color: colors.ink, fontSize: 13.5 },
  time: { fontSize: 11, color: colors.inkSoft },
  mediaWrap: { width: '100%', aspectRatio: 1, backgroundColor: colors.paper2 },
  actions: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },
  actionBtn: { padding: 2 },
  meta: { paddingHorizontal: 16, paddingTop: 4, gap: 2, paddingBottom: 4 },
  likes: { fontWeight: '700', fontSize: 13, color: colors.ink },
  caption: { fontSize: 13, color: colors.ink }
});
