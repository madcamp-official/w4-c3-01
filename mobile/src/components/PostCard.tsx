// Ported from frontend/src/components/PostCard.tsx — keep in sync.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import Avatar from '@/components/Avatar';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { colors, radius } from '@/theme/colors';
import type { Post } from '@/types';

export default function PostCard({ post }: { post: Post }) {
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
    <View style={styles.card}>
      <View style={styles.head}>
        <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} avatarUrl={post.avatarUrl} />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.time}>{post.time}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => openViewer({ image: post.image, caption: post.caption, strokes: post.strokes, postId: post.id })}
      >
        <Image source={{ uri: post.image }} style={styles.media} />
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={handleLike} style={styles.actionBtn}>
          <Animated.View style={heartStyle}>
            {session?.heartUrl ? (
              <Image source={{ uri: session.heartUrl }} style={{ width: 22, height: 22 }} resizeMode="contain" />
            ) : (
              <Feather name="heart" size={22} color={colors.ink} />
            )}
          </Animated.View>
        </Pressable>
        <Pressable onPress={() => openComments(post.id)} style={styles.actionBtn}>
          <Feather name="message-circle" size={22} color={colors.ink} />
        </Pressable>
        <Pressable onPress={() => openShare(post.id)} style={styles.actionBtn}>
          <Feather name="send" size={22} color={colors.ink} />
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
        <Text style={styles.time}>{post.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 10, marginBottom: 4 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  username: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  time: { fontSize: 11, color: colors.inkSoft },
  media: { width: '100%', aspectRatio: 1, backgroundColor: colors.paper2, borderRadius: radius.md },
  actions: { flexDirection: 'row', gap: 14, paddingHorizontal: 12, paddingTop: 8 },
  actionBtn: { padding: 2 },
  meta: { paddingHorizontal: 12, paddingTop: 4, gap: 2 },
  likes: { fontWeight: '700', fontSize: 12, color: colors.ink },
  caption: { fontSize: 13, color: colors.ink }
});
