// Ported from frontend/src/pages/MyPage.tsx — keep in sync.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import Avatar from '@/components/Avatar';
import SketchyButton from '@/components/SketchyButton';
import SketchyLine from '@/components/SketchyLine';
import * as followApi from '@/api/followApi';
import type { FollowCounts } from '@/api/followApi';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { colors, radius } from '@/theme/colors';
import { common } from '@/theme/common';
import type { Post } from '@/types';

const GRID_GAP = 2;
const AVATAR_SIZE = 54;
const RING_R = 29;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function MyScreen() {
  const navigation = useNavigation();
  const { session, posts } = useAppState();
  const { openViewer } = useOverlay();
  const [tab, setTab] = useState<'posts' | 'likes'>('posts');
  const [counts, setCounts] = useState<FollowCounts | null>(null);
  const [avatarSpin, setAvatarSpin] = useState(false);
  const ringOffset = useSharedValue(RING_CIRCUMFERENCE);
  const ringAnimatedProps = useAnimatedProps(() => ({ strokeDashoffset: ringOffset.value }));

  function handleAvatarPress() {
    setAvatarSpin(true);
    ringOffset.value = RING_CIRCUMFERENCE;
    ringOffset.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) });
    setTimeout(() => setAvatarSpin(false), 900);
  }

  const myPosts = useMemo(() => posts.filter((p) => p.mine), [posts]);
  const likedPosts = useMemo(() => posts.filter((p) => p.liked), [posts]);
  const items = tab === 'posts' ? myPosts : likedPosts;

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    followApi.fetchFollowCounts(session.id).then((result) => {
      if (!cancelled) setCounts(result);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) return null;

  function renderCell({ item }: { item: Post }) {
    return (
      <Pressable
        style={styles.cell}
        onPress={() => openViewer({ image: item.image, caption: item.caption, strokes: item.strokes, postId: item.id })}
      >
        <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <Text style={[common.title, { marginBottom: 12 }]}>마이페이지</Text>
      <View style={styles.profileCard}>
        <Pressable onPress={handleAvatarPress} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
          <Avatar nickname={session.nickname} color={session.avatarColor} size={AVATAR_SIZE} fontSize={20} avatarUrl={session.avatarUrl} />
          {avatarSpin ? (
            <Svg width={AVATAR_SIZE + 10} height={AVATAR_SIZE + 10} style={{ position: 'absolute', top: -5, left: -5 }} pointerEvents="none">
              <AnimatedCircle
                cx={(AVATAR_SIZE + 10) / 2}
                cy={(AVATAR_SIZE + 10) / 2}
                r={RING_R}
                fill="none"
                stroke={colors.accent}
                strokeWidth={2.4}
                strokeDasharray={RING_CIRCUMFERENCE}
                animatedProps={ringAnimatedProps}
              />
            </Svg>
          ) : null}
        </Pressable>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.name}>{session.nickname}</Text>
          <Text style={styles.handle}>{session.username ? '@' + session.username : 'ALine에서 손글씨로 이야기해요'}</Text>
        </View>
      </View>
      <SketchyLine seed="my-stats-top" />
      <View style={[styles.stats, { marginBottom: 0 }]}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{myPosts.length}</Text>
          <Text style={styles.statLabel}>게시물</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{counts?.followers ?? ''}</Text>
          <Text style={styles.statLabel}>팔로워</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{counts?.following ?? ''}</Text>
          <Text style={styles.statLabel}>팔로잉</Text>
        </View>
      </View>
      <SketchyLine seed="my-stats-bottom" style={{ marginBottom: 12 }} />
      <View style={styles.actionsRow}>
        <SketchyButton
          variant="ghost"
          blobVariant="a"
          style={{ flex: 1 }}
          onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('EditProfile')}
        >
          <Text style={common.btnGhostText}>프로필 수정</Text>
        </SketchyButton>
        <SketchyButton
          variant="ghost"
          blobVariant="b"
          style={{ flex: 1 }}
          onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('EditHeart')}
        >
          <Text style={common.btnGhostText}>하트 다시 그리기</Text>
        </SketchyButton>
      </View>
      <View style={[styles.tabbar, { borderBottomWidth: 0 }]}>
        <Pressable style={styles.tabBtn} onPress={() => setTab('posts')}>
          <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>내 게시물</Text>
        </Pressable>
        <Pressable style={styles.tabBtn} onPress={() => setTab('likes')}>
          <Text style={[styles.tabText, tab === 'likes' && styles.tabTextActive]}>좋아요한 게시물</Text>
        </Pressable>
      </View>
      <SketchyLine seed="my-tabbar" style={{ marginBottom: 2 }} />
      {items.length === 0 ? (
        <Text style={styles.emptyNote}>
          {tab === 'posts' ? '아직 올린 게시물이 없어요. + 버튼으로 첫 손글씨를 남겨보세요.' : '좋아요를 누른 게시물이 여기 모여요.'}
        </Text>
      ) : (
        <FlatList data={items} keyExtractor={(p) => p.id} renderItem={renderCell} numColumns={3} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  name: { fontSize: 16, fontWeight: '700', color: colors.ink },
  handle: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '700', color: colors.ink },
  statLabel: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabbar: { flexDirection: 'row', marginBottom: 2 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 13, color: colors.inkSoft },
  tabTextActive: { color: colors.ink, fontWeight: '700' },
  emptyNote: { textAlign: 'center', color: colors.inkSoft, fontSize: 13, marginTop: 30, paddingHorizontal: 20 },
  cell: { flex: 1 / 3, aspectRatio: 1, margin: GRID_GAP, backgroundColor: colors.paper2, borderRadius: radius.md, overflow: 'hidden' }
});
