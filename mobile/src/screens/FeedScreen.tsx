// Ported from frontend/src/pages/FeedPage.tsx — keep in sync. Two feed modes,
// matching week4_1/ALine.dc.html's home screen: "card" is one floating
// story-style card (next post peeking out from behind), dragged forward-only
// (dragging "back" past center is heavily damped, not hard-blocked — matches
// the prototype's `if (dx > 0) dx *= 0.2`) with a fling-off exit animation
// past threshold; a clear upward swipe switches to "list", a compact
// scrolling list. There's no way back to card mode from list — removed by
// request.
//
// This is a single custom Gesture.Pan() driving dragX/dragY/rotate shared
// values on the card itself (not a horizontal strip of all posts) — only the
// current + next post are ever mounted, matching the prototype's DOM shape.
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Avatar from '@/components/Avatar';
import LikeButton from '@/components/LikeButton';
import PostCard from '@/components/PostCard';
import StrokeReplay from '@/components/StrokeReplay';
import TopBar from '@/components/TopBar';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = Math.min(318, SCREEN_WIDTH - 68);
const SWIPE_THRESHOLD = 70;
const EXIT_MS = 260;

export default function FeedScreen() {
  const { posts, loadFeed, loadChats, loadNotifications, startConversationWith, sendText } = useAppState();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const [mode, setMode] = useState<'card' | 'list'>('card');
  const [activeIndex, setActiveIndex] = useState(0);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [sourceAspect, setSourceAspect] = useState(1);
  const styles = makeStyles(colors);
  const currentPost = posts[activeIndex];
  const peekPost = activeIndex + 1 < posts.length ? posts[activeIndex + 1] : null;
  const postsLength = posts.length;

  // A plain mount-only effect only re-fetched once — the tab stays mounted
  // underneath UserProfile/other screens, so following someone there and
  // coming back never refreshed the (now-stale) followed-users feed filter
  // until the app fully remounted. useFocusEffect re-fetches every time this
  // tab is shown again, not just on first mount.
  useFocusEffect(
    useCallback(() => {
      void loadFeed();
      void loadChats();
      void loadNotifications();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Reset to the first post whenever the feed is (re)entered fresh in card mode.
  useEffect(() => {
    if (mode === 'card') setActiveIndex(0);
  }, [mode]);

  useEffect(() => {
    setMessageDraft('');
    setReplaying(false);
  }, [activeIndex]);

  useEffect(() => {
    if (!currentPost) return;
    // Strokes are normalized against the original (often non-square) capture
    // canvas, but the photo displays cropped to a square via resizeMode="cover" —
    // fetch the real image dimensions so the replay path can apply the same crop.
    Image.getSize(
      currentPost.image,
      (w, h) => setSourceAspect(w / h),
      () => setSourceAspect(1)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPost?.image]);

  function handleReplay() {
    setReplaying(true);
    setReplayKey((k) => k + 1);
  }

  const toList = useCallback(() => setMode('list'), []);

  async function handleSendMessage() {
    const text = messageDraft.trim();
    if (!text || !currentPost || sendingMessage) return;
    setSendingMessage(true);
    try {
      const chatId = await startConversationWith(currentPost.authorId);
      if (!chatId) {
        showToast('채팅을 시작하지 못했어요');
        return;
      }
      await sendText(chatId, text);
      setMessageDraft('');
      showToast('메시지를 보냈어요');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '메시지를 보내지 못했어요');
    } finally {
      setSendingMessage(false);
    }
  }

  const idx = useSharedValue(0);
  const dragX = useSharedValue(0);
  const rawDragY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateDeg = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  useEffect(() => {
    idx.value = activeIndex;
    // Reset the card's drag/exit shared values only once the NEW post's
    // content has actually rendered for this index — resetting them at the
    // same time as scheduleAdvance's setTimeout (UI thread, synchronous)
    // would snap the card back to "centered, fully visible" a frame or more
    // before React's setActiveIndex re-render lands, so the OLD post would
    // flash back into view at rest position before the new one swaps in.
    dragX.value = 0;
    rawDragY.value = 0;
    translateY.value = 0;
    rotateDeg.value = 0;
    cardOpacity.value = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const scheduleAdvance = useCallback(() => {
    setTimeout(() => {
      setActiveIndex((i) => Math.min(i + 1, postsLength - 1));
    }, EXIT_MS);
  }, [postsLength]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      let dx = e.translationX;
      if (dx > 0) dx *= 0.2; // dragging "back" resists instead of hard-stopping
      dragX.value = dx;
      rawDragY.value = e.translationY;
      translateY.value = e.translationY * 0.15;
      rotateDeg.value = Math.max(-18, Math.min(6, dx / 14));
    })
    .onEnd(() => {
      if (rawDragY.value < -SWIPE_THRESHOLD && Math.abs(rawDragY.value) > Math.abs(dragX.value)) {
        dragX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        rotateDeg.value = withTiming(0, { duration: 200 });
        runOnJS(toList)();
        return;
      }
      if (dragX.value < -(SWIPE_THRESHOLD + 20) && idx.value < postsLength - 1) {
        dragX.value = withTiming(-560, { duration: EXIT_MS });
        translateY.value = withTiming(40, { duration: EXIT_MS });
        rotateDeg.value = withTiming(-16, { duration: EXIT_MS });
        cardOpacity.value = withTiming(0, { duration: EXIT_MS });
        runOnJS(scheduleAdvance)();
        return;
      }
      dragX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      rotateDeg.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: dragX.value }, { translateY: translateY.value }, { rotate: `${rotateDeg.value}deg` }]
  }));

  const bounce = useSharedValue(0);
  useEffect(() => {
    if (mode !== 'card') return;
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TopBar />

      {mode === 'card' ? (
        <>
          {/* The pan gesture covers this whole area (dots + stage + hint),
              not just the card image, so an upward swipe started anywhere
              here — not only on top of the photo — reveals the list. It
              still only visually drags the card itself (cardAnimatedStyle
              below), and doesn't wrap the DM input row so typing there isn't
              affected. */}
          <GestureDetector gesture={pan}>
            <View style={{ flex: 1 }}>
              {posts.length ? (
                <View style={styles.dotsRow}>
                  {posts.map((post, i) => (
                    <View key={post.id} style={i <= activeIndex ? styles.dotActive : styles.dotInactive} />
                  ))}
                </View>
              ) : null}
              <View style={styles.storyStage}>
                <View style={[styles.storyFrame, { width: CARD_SIZE, height: CARD_SIZE }]}>
                  {peekPost ? (
                    <View style={styles.storyPeek}>
                      <Image source={{ uri: peekPost.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    </View>
                  ) : null}
                  {currentPost ? (
                    <Animated.View style={[styles.storyCard, cardAnimatedStyle]}>
                      {/* A plain Pressable nested here (rather than composing
                          a tap gesture with `pan`) works the same way the
                          hint button below already does: RNGH's Pan only
                          claims the touch once it exceeds its move
                          threshold, so a stationary tap still reaches this
                          Pressable untouched. */}
                      <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={currentPost.strokes.length ? handleReplay : undefined}
                        disabled={currentPost.strokes.length === 0}
                      >
                        <Image source={{ uri: currentPost.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        {replaying && currentPost.strokes.length ? (
                          <StrokeReplay
                            key={replayKey}
                            strokes={currentPost.strokes}
                            width={CARD_SIZE}
                            height={CARD_SIZE}
                            sourceAspect={sourceAspect}
                            onDone={() => setReplaying(false)}
                          />
                        ) : null}
                      </Pressable>
                      <Pressable
                        style={styles.storyTopbar}
                        onPress={() =>
                          currentPost.mine
                            ? navigation.navigate('My')
                            : navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('UserProfile', { userId: currentPost.authorId })
                        }
                      >
                        <Avatar nickname={currentPost.username} color={currentPost.avatarColor} size={30} fontSize={12} avatarUrl={currentPost.avatarUrl} />
                        <Text style={styles.storyTopbarText}>
                          {currentPost.username} · {currentPost.time}
                        </Text>
                      </Pressable>
                      <View style={styles.storyStats}>
                        <View style={styles.storyStat}>
                          <LikeButton post={currentPost} size={18} light />
                          <Text style={styles.storyStatText}>{currentPost.likes}</Text>
                        </View>
                        <Pressable
                          style={styles.storyStat}
                          onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('Comment', { postId: currentPost.id })}
                        >
                          <Icon name="message-circle" size={16} color="#fff" sketchy={false} />
                          <Text style={styles.storyStatText}>{currentPost.comments.length}</Text>
                        </Pressable>
                      </View>
                    </Animated.View>
                  ) : null}
                </View>
              </View>
              <Pressable style={styles.hint} onPress={toList}>
                <Animated.View style={[styles.hintInner, bounceStyle]}>
                  <View style={{ transform: [{ rotate: '90deg' }] }}>
                    <Icon name="chevron-left" size={16} color={colors.inkSoft} sketchy={false} />
                  </View>
                  <Text style={styles.hintText}>위로 밀어 피드 보기 · 옆으로 밀어 다음 이야기</Text>
                </Animated.View>
              </Pressable>
            </View>
          </GestureDetector>
          {currentPost ? (
            <View style={styles.dmRow}>
              <TextInput
                style={styles.dmInput}
                value={messageDraft}
                onChangeText={setMessageDraft}
                onSubmitEditing={handleSendMessage}
                placeholder={`${currentPost.username}에게 메시지 보내기...`}
                placeholderTextColor={colors.muted}
              />
              <Pressable
                style={[styles.dmSend, (sendingMessage || !messageDraft.trim()) && { opacity: 0.5 }]}
                onPress={handleSendMessage}
                disabled={sendingMessage || !messageDraft.trim()}
              >
                <Icon name="send" size={16} color="#fff" sketchy={false} />
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            renderItem={({ item, index }) => <PostCard post={item} isLast={index === posts.length - 1} />}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
    dotsRow: { flexDirection: 'row', gap: 5, justifyContent: 'center', paddingTop: 4, paddingBottom: 12 },
    dotInactive: { width: 5, height: 4, borderRadius: 2, backgroundColor: colors.border },
    dotActive: { width: 14, height: 4, borderRadius: 2, backgroundColor: colors.ink },
    storyStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingVertical: 12 },
    storyFrame: { position: 'relative' },
    storyPeek: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      bottom: 8,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: colors.paper2,
      opacity: 0.38,
      transform: [{ scale: 0.95 }, { translateY: 12 }]
    },
    storyCard: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: colors.paper2,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8
    },
    storyTopbar: {
      position: 'absolute',
      left: 12,
      top: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingRight: 12,
      paddingVertical: 5,
      paddingLeft: 5,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(8,10,14,0.48)'
    },
    storyTopbarText: { color: '#fff', fontSize: 12, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    storyStats: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(8,10,14,0.48)'
    },
    storyStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    storyStatText: { color: '#fff', fontSize: 12, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    hint: { alignItems: 'center', paddingTop: 10 },
    hintInner: { alignItems: 'center', gap: 2 },
    hintText: { fontSize: 11, color: colors.inkSoft },
    dmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 8 },
    dmInput: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderWidth: 1.4,
      borderColor: colors.border,
      borderRadius: radius.pill,
      fontSize: 13,
      color: colors.ink
    },
    dmSend: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center'
    }
  });
}
