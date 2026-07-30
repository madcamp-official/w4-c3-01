// Ported from frontend/src/components/LikeButton.tsx — keep in sync.
import { Image, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import type { Post } from '@/types';

/** Shared like button (hand-drawn heart doodle + pop animation) — used by
 * both the compact list card (PostCard) and the swipeable story card
 * (FeedScreen). */
export default function LikeButton({
  post,
  size = 22,
  style,
  light
}: {
  post: Post;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Forces the heart to render white regardless of theme — for placements
   * (the feed's story-card overlay) that sit on top of a photo rather than
   * the page background, matching the comment icon beside it there. */
  light?: boolean;
}) {
  const { session, likePost } = useAppState();
  const { colors, isDark } = useTheme();

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
    <Pressable onPress={handleLike} style={[styles.btn, style]}>
      <Animated.View style={heartStyle}>
        {session?.heartUrl ? (
          // The doodle is always drawn in dark ink on a transparent background —
          // invisible on a dark background, so tint it white in dark mode (or
          // always, in a `light` placement like the feed's story-card overlay).
          // Liked posts override all of that with the app's red accent color.
          <Image
            source={{ uri: session.heartUrl }}
            style={{ width: size, height: size, tintColor: post.liked ? colors.accent : light || isDark ? '#fff' : undefined }}
            resizeMode="contain"
          />
        ) : (
          <Icon name="heart" size={size} color={post.liked ? colors.accent : light ? '#fff' : colors.ink} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 2 }
});
