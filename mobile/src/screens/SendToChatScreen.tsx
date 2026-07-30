// Ported from frontend/src/components/SendToChatSheet.tsx — keep in sync.
// Bottom-sheet style, matching CommentScreen.tsx's shape (transparentModal +
// backdrop fade/sheet slide driven once on mount) — no keyboard/text input
// here, so none of CommentScreen's KeyboardAvoidingView reasoning applies,
// but the visual "slides up from the bottom, scrollable" shape is the same.
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import * as followApi from '@/api/followApi';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import type { UserSummary } from '@/types';

const ANIM_DURATION = 220;

type Props = NativeStackScreenProps<AppStackParamList, 'SendToChat'>;

export default function SendToChatScreen({ navigation, route }: Props) {
  const { postId } = route.params;
  const { session, posts, startConversationWith, sendPost } = useAppState();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const bottomInset = useBottomInset();
  const styles = makeStyles(colors, bottomInset);
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const post = posts.find((p) => p.id === postId);

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(60);
  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: ANIM_DURATION });
    sheetTranslateY.value = withTiming(0, { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetTranslateY.value }] }));

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    followApi.fetchMutualFollowing(session.id).then((result) => {
      if (!cancelled) setUsers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleSelect(otherUserId: string) {
    if (!post || sendingTo) return;
    setSendingTo(otherUserId);
    try {
      const chatId = await startConversationWith(otherUserId);
      if (!chatId) {
        showToast('채팅을 시작하지 못했어요');
        return;
      }
      await sendPost(chatId, post);
      showToast('게시물을 보냈어요');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '게시물을 보내지 못했어요');
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />
      </Animated.View>
      <Animated.View style={sheetAnimatedStyle}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>채팅으로 보내기</Text>
          {users === null ? (
            <ActivityIndicator color={colors.ink} style={{ paddingVertical: 20 }} />
          ) : users.length === 0 ? (
            <Text style={styles.empty}>맞팔로우한 사람이 없어요.</Text>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(u) => u.id}
              style={styles.list}
              renderItem={({ item: u }) => (
                <Pressable
                  style={[styles.userRow, { opacity: sendingTo && sendingTo !== u.id ? 0.4 : 1 }]}
                  disabled={Boolean(sendingTo)}
                  onPress={() => handleSelect(u.id)}
                >
                  <Avatar nickname={u.nickname} color={u.avatarColor} size={40} fontSize={14} avatarUrl={u.avatarUrl} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{u.nickname}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.inkSoft }}>@{u.username}</Text>
                  </View>
                  {sendingTo === u.id ? <ActivityIndicator color={colors.ink} /> : null}
                </Pressable>
              )}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,17,12,0.5)' },
    sheet: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: 16,
      paddingBottom: 24 + bottomInset
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 10 },
    title: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10 },
    empty: { fontSize: 13, color: colors.inkSoft, paddingVertical: 20, textAlign: 'center' },
    list: { maxHeight: 420 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }
  });
}
