// Ported from frontend/src/components/PostCard.tsx — keep in sync. Compact
// list-mode card — see FeedScreen.tsx for the swipeable story-card mode (a
// separate renderer), both keep the post image 1:1 square.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import LikeButton from '@/components/LikeButton';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import { radius as radiusTokens } from '@/theme/colors';
import type { Post } from '@/types';

export default function PostCard({ post, isLast }: { post: Post; isLast?: boolean }) {
  const { openShare } = useOverlay();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const openComments = (postId: string) =>
    navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('Comment', { postId });
  const openPostDetail = (postId: string) =>
    navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('PostDetail', { postId });
  const openProfile = () =>
    post.mine
      ? navigation.navigate('My')
      : navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('UserProfile', { userId: post.authorId });

  return (
    <View style={[styles.card, isLast && styles.cardLast]}>
      <Pressable style={styles.head} onPress={openProfile}>
        <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} avatarUrl={post.avatarUrl} />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.time}>{post.time}</Text>
        </View>
      </Pressable>
      <Pressable style={[styles.mediaWrap, styles.mediaWrapRounded]} onPress={() => openPostDetail(post.id)}>
        <Image source={{ uri: post.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
    head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 34, paddingVertical: 12 },
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
