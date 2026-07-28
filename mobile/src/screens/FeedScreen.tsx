// Ported from frontend/src/pages/FeedPage.tsx — keep in sync. Two feed modes,
// matching 4주차/week4/ALine Prototype.dc.html's home screen: "horizontal" is
// one full-bleed post per page, dragged forward-only (once you've moved on to
// the next post you can't drag back to a previous one — matches the
// prototype's `if (dx > 0) dx = 0` clamp exactly); a clear upward swipe
// switches to "vertical", a compact scrolling list. There's no way back to
// horizontal mode from vertical — removed by request.
//
// This is a single custom Gesture.Pan() driving an animated translateX,
// rather than a native `FlatList horizontal pagingEnabled` — a plain
// FlatList's scroll view is bidirectional (can't forbid backward paging) and,
// wrapped in a separate GestureDetector for the vertical swipe, the two
// gesture recognizers fought each other and the vertical swipe frequently
// never activated. One gesture reading both axes avoids that entirely.
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import Icon from '@/components/Icon';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import PostCard from '@/components/PostCard';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { colors } from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 70;
const SWIPE_UP_THRESHOLD = 60;
const SWIPE_UP_VELOCITY = 800;

export default function FeedScreen() {
  const { posts, loadFeed } = useAppState();
  const navigation = useNavigation();
  const [mode, setMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset to the first post whenever the feed is (re)entered fresh in horizontal mode.
  useEffect(() => {
    if (mode === 'horizontal') setActiveIndex(0);
  }, [mode]);

  const toVertical = useCallback(() => setMode('vertical'), []);

  const idx = useSharedValue(0);
  const translateX = useSharedValue(0);
  const postsLength = posts.length;

  useEffect(() => {
    idx.value = activeIndex;
    translateX.value = withTiming(-activeIndex * SCREEN_WIDTH, { duration: 280 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const advance = useCallback(() => {
    setActiveIndex((i) => Math.min(i + 1, postsLength - 1));
  }, [postsLength]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const { translationX, translationY } = e;
      const verticalDominant = Math.abs(translationY) > Math.abs(translationX) && translationY < -10;
      if (verticalDominant) return;
      let dx = translationX;
      if (dx > 0) dx = 0; // forward-only — dragging "back" never moves the strip
      if (idx.value >= postsLength - 1) dx = 0;
      translateX.value = -idx.value * SCREEN_WIDTH + dx;
    })
    .onEnd((e) => {
      const { translationX, translationY, velocityY } = e;
      const verticalDominant = Math.abs(translationY) > Math.abs(translationX);
      if (verticalDominant && (translationY < -SWIPE_UP_THRESHOLD || velocityY < -SWIPE_UP_VELOCITY)) {
        translateX.value = withTiming(-idx.value * SCREEN_WIDTH, { duration: 200 });
        runOnJS(toVertical)();
        return;
      }
      if (translationX < -SWIPE_THRESHOLD && idx.value < postsLength - 1) {
        runOnJS(advance)();
        return;
      }
      translateX.value = withTiming(-idx.value * SCREEN_WIDTH, { duration: 280, easing: Easing.out(Easing.ease) });
    });

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const bounce = useSharedValue(0);
  useEffect(() => {
    if (mode !== 'horizontal') return;
    bounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.dot} />
          <Text style={styles.logo}>ALine</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('ChatList')}>
          <Icon name="send" size={20} color={colors.ink} />
        </Pressable>
      </View>

      {mode === 'horizontal' ? (
        <GestureDetector gesture={pan}>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <Animated.View style={[{ flex: 1, flexDirection: 'row', width: SCREEN_WIDTH * posts.length }, stripStyle]}>
              {posts.map((post) => (
                <View key={post.id} style={{ width: SCREEN_WIDTH, height: '100%' }}>
                  <PostCard post={post} variant="horizontal" />
                </View>
              ))}
            </Animated.View>
            <Pressable style={styles.hint} onPress={toVertical}>
              <Animated.View style={[styles.hintInner, bounceStyle]}>
                <View style={{ transform: [{ rotate: '90deg' }] }}>
                  <Icon name="chevron-left" size={16} color={colors.inkSoft} sketchy={false} />
                </View>
                <Text style={styles.hintText}>위로 스와이프하면 피드 보기</Text>
              </Animated.View>
            </Pressable>
          </View>
        </GestureDetector>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => <PostCard post={item} variant="vertical" />}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  logo: { fontSize: 19, fontWeight: '800', color: colors.ink },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center' },
  hintInner: { alignItems: 'center', gap: 2 },
  hintText: { fontSize: 11, color: colors.inkSoft }
});
