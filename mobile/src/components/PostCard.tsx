import { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import LikeButton from '@/components/LikeButton';
import PostMenu from '@/components/PostMenu';
import StrokeReplay from '@/components/StrokeReplay';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import type { Post } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_SIZE = SCREEN_WIDTH - 56;

export default function PostCard({ post }: { post: Post; isLast?: boolean }) {
  const { openShare } = useOverlay();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const [replaying, setReplaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [sourceAspect, setSourceAspect] = useState(1);
  const videoPlayer = useVideoPlayer(post.videoUrl ?? null, (player) => {
    player.loop = true;
    player.muted = true;
    if (post.videoUrl) player.play();
  });

  const openComments = () =>
    navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('Comment', { postId: post.id });
  const openPostDetail = () =>
    navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('PostDetail', { postId: post.id });
  const openEdit = () =>
    navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('Preview', {
      image: post.image,
      video: post.videoUrl,
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
    Image.getSize(
      post.image,
      (width, height) => setSourceAspect(width / height),
      () => setSourceAspect(1)
    );
  }, [post.image]);

  function handleMediaPress() {
    if (post.videoUrl) {
      videoPlayer.currentTime = 0;
      videoPlayer.play();
      return;
    }
    if (post.strokes.length) {
      setReplaying(true);
      setReplayKey((key) => key + 1);
      return;
    }
    openPostDetail();
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable style={styles.profile} onPress={openProfile} accessibilityRole="button">
          <Avatar
            nickname={post.username}
            color={post.avatarColor}
            size={38}
            fontSize={14}
            avatarUrl={post.avatarUrl}
          />
          <View style={styles.profileCopy}>
            <Text style={styles.username} numberOfLines={1}>
              {post.username}
            </Text>
            <Text style={styles.time}>{post.time}</Text>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <View style={styles.headerActionButton}>
            <LikeButton post={post} size={18} />
          </View>
          <Pressable style={styles.headerActionButton} onPress={openComments} accessibilityLabel="댓글">
            <Icon name="message-circle" size={18} color={colors.ink} sketchy={false} />
          </Pressable>
          <Pressable
            style={styles.headerActionButton}
            onPress={() => openShare(post.id)}
            accessibilityLabel="공유"
          >
            <Icon name="send" size={17} color={colors.ink} sketchy={false} />
          </Pressable>
          <PostMenu post={post} triggerStyle={styles.menuButton} onEdit={openEdit} />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.media, pressed && styles.mediaPressed]}
        onPress={handleMediaPress}
        accessibilityRole="button"
        accessibilityLabel={`${post.username}님의 그림 재생`}
      >
        {post.videoUrl ? (
          <VideoView
            player={videoPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            surfaceType="textureView"
          />
        ) : (
          <Image source={{ uri: post.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
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
        <Pressable style={styles.openBadge} onPress={openPostDetail} accessibilityLabel="게시물 자세히 보기">
          <View style={styles.openIcon}>
            <Icon name="chevron-left" size={14} color="#fff" sketchy={false} />
          </View>
        </Pressable>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.captionBlock}>
          {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
          {post.comments.length ? (
            <Pressable onPress={openComments} hitSlop={8}>
              <Text style={styles.comments}>댓글 {post.comments.length}개 모두 보기</Text>
            </Pressable>
          ) : (
            <Text style={styles.comments}>첫 댓글을 남겨보세요</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    card: {
      padding: 10,
      marginHorizontal: 18,
      marginVertical: 10,
      borderRadius: 30,
      backgroundColor: colors.paper2,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#160D08',
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 9 },
      elevation: 5
    },
    header: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      paddingBottom: 10
    },
    profile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0
    },
    profileCopy: {
      flex: 1,
      marginLeft: 10
    },
    username: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800'
    },
    time: {
      color: colors.inkSoft,
      fontSize: 10.5,
      marginTop: 2
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginLeft: 6
    },
    headerActionButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.paper
    },
    menuButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.paper
    },
    media: {
      aspectRatio: 1,
      overflow: 'hidden',
      borderRadius: 22,
      backgroundColor: colors.paper3
    },
    mediaPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.995 }]
    },
    openBadge: {
      position: 'absolute',
      right: 12,
      top: 12,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(8, 8, 8, 0.52)'
    },
    openIcon: {
      transform: [{ rotate: '135deg' }]
    },
    footer: {
      paddingHorizontal: 6,
      paddingTop: 13,
      paddingBottom: 4
    },
    captionBlock: {
      width: '100%'
    },
    caption: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18
    },
    comments: {
      color: colors.inkSoft,
      fontSize: 10.5,
      marginTop: 5
    }
  });
}
