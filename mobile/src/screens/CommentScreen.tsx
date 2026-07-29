// Was a hand-built overlay (BottomSheetModal + CommentSheet) — after six
// different attempts (marginBottom, translateY via Reanimated re-triggered
// from an effect, a plain non-Reanimated transform) all failed to visibly
// react to the keyboard on-device despite each one's underlying state/props
// demonstrably updating, this is now a real navigation screen instead,
// presented as a transparent modal. ChatThreadScreen's KeyboardAvoidingView
// reliably clears its keyboard, and the working theory for why the overlay
// never did is that KeyboardAvoidingView's math compares its own onLayout
// position (reported relative to its *immediate parent*) against the
// keyboard's absolute screen position — correct for a screen like this one
// that fills top-to-bottom from y≈0, but wrong for a small box pinned to the
// bottom of an absolutely-positioned wrapper, whose relative y is ~0
// regardless of where it actually sits on screen. Structuring this as a
// full-screen KeyboardAvoidingView (transparent top area, sheet-styled
// bottom via flex-end) matches the working screen's shape instead of
// reproducing the overlay's.
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import Sketchy from '@/components/Sketchy';
import SketchyInput from '@/components/SketchyInput';
import { useBottomInset } from '@/lib/useBottomInset';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';

const ANIM_DURATION = 220;

type Props = NativeStackScreenProps<AppStackParamList, 'Comment'>;

export default function CommentScreen({ navigation, route }: Props) {
  const { postId } = route.params;
  const { session, posts, commentOnPost, deleteComment } = useAppState();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const bottomInset = useBottomInset();
  // Keyboard already covers where this padding would clear the system nav
  // bar, so it's just dead space (and a gap above the keyboard) while up.
  const keyboardVisible = useKeyboardHeight() > 0;
  const styles = makeStyles(colors, bottomInset, keyboardVisible);
  const [text, setText] = useState('');

  // The screen itself uses navigation's plain "fade" transition (see
  // AppStack.tsx) — sliding the whole transparent screen (dim backdrop
  // included) up as one unit looked like "a black screen rising with the
  // sheet", the exact thing the old hand-built overlay was built to avoid.
  // This drives just the backdrop fade + sheet slide, once, on mount —
  // unlike the keyboard offset, this never updates afterward, so it doesn't
  // touch whatever made live updates invisible on the old overlay.
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(60);
  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: ANIM_DURATION });
    sheetTranslateY.value = withTiming(0, { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetTranslateY.value }] }));

  const post = posts.find((p) => p.id === postId);

  async function handleSend() {
    if (!post || !text.trim()) return;
    try {
      await commentOnPost(post.id, text.trim());
      setText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '댓글을 등록하지 못했어요');
    }
  }

  async function handleDelete(commentId: number) {
    if (!post) return;
    try {
      await deleteComment(post.id, commentId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '댓글을 삭제하지 못했어요');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />
      </Animated.View>
      <Animated.View style={sheetAnimatedStyle}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>댓글</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {post && post.comments.length === 0 ? (
              <Text style={styles.empty}>아직 댓글이 없어요. 첫 댓글을 남겨보세요!</Text>
            ) : (
              post?.comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <Avatar nickname={c.user} color={c.avatarColor ?? '#E3D9BB'} avatarUrl={c.avatarUrl} size={26} fontSize={10} />
                  <Text style={styles.commentText}>
                    <Text style={{ fontWeight: '700' }}>{c.user} </Text>
                    {c.text}
                  </Text>
                  {session?.id === c.authorId ? (
                    <Pressable style={styles.deleteBtn} onPress={() => handleDelete(c.id)} accessibilityLabel="댓글 삭제">
                      <Icon name="x" size={13} color={colors.inkSoft} />
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.inputRow}>
            <SketchyInput
              style={{ flex: 1, borderRadius: radius.pill }}
              placeholder="댓글 달기..."
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
            />
            <Pressable onPress={handleSend}>
              <Sketchy radius={19} strokeWidth={0} seed="comment-send" style={styles.sendBtn}>
                <Icon name="send" size={18} color={colors.paper} />
              </Sketchy>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors, bottomInset: number, keyboardVisible: boolean) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,17,12,0.5)' },
    sheet: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: 16,
      paddingBottom: keyboardVisible ? 16 : 24 + bottomInset
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 10 },
    title: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10 },
    empty: { fontSize: 13, color: colors.inkSoft, paddingVertical: 20, textAlign: 'center' },
    commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
    commentText: { flex: 1, fontSize: 13, color: colors.ink },
    deleteBtn: { padding: 4 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }
  });
}
