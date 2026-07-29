// Ported from frontend/src/pages/MyPage.tsx — keep in sync.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Avatar from '@/components/Avatar';
import SketchyButton from '@/components/SketchyButton';
import SketchyLine from '@/components/SketchyLine';
import * as followApi from '@/api/followApi';
import type { FollowCounts } from '@/api/followApi';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';
import type { Post } from '@/types';

const GRID_GAP = 2;
const AVATAR_SIZE = 61;

export default function MyScreen() {
  const navigation = useNavigation();
  const { session, posts } = useAppState();
  const { openViewer } = useOverlay();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const styles = makeStyles(colors);
  const [tab, setTab] = useState<'posts' | 'likes'>('posts');
  const [counts, setCounts] = useState<FollowCounts | null>(null);

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
      <View style={[styles.profileCard, { marginTop: 28 }]}>
        <Avatar nickname={session.nickname} color={session.avatarColor} size={AVATAR_SIZE} fontSize={20} avatarUrl={session.avatarUrl} outline />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{session.nickname}</Text>
          <Text style={styles.handle}>{session.username ? '@' + session.username : 'ALine에서 손글씨로 이야기해요'}</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{myPosts.length}</Text>
            <Text style={styles.statLabel}>게시물</Text>
          </View>
          <Pressable
            style={styles.statItem}
            onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('FollowList', { userId: session.id, mode: 'followers' })}
          >
            <Text style={styles.statNum}>{counts?.followers ?? ''}</Text>
            <Text style={styles.statLabel}>팔로워</Text>
          </Pressable>
          <Pressable
            style={styles.statItem}
            onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('FollowList', { userId: session.id, mode: 'following' })}
          >
            <Text style={styles.statNum}>{counts?.following ?? ''}</Text>
            <Text style={styles.statLabel}>팔로잉</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.bioBlock}>
        <Text style={[styles.bio, !session.bio && styles.bioPlaceholder]}>
          {session.bio || '자기소개를 추가해보세요'}
        </Text>
      </View>
      <View style={styles.actionsRow}>
        <SketchyButton
          variant="ghost"
          blobVariant="a"
          borderColor={colors.ink}
          style={{ flex: 1 }}
          onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('EditProfile')}
        >
          <Text style={common.btnGhostText}>프로필 수정</Text>
        </SketchyButton>
        <SketchyButton
          variant="ghost"
          blobVariant="b"
          borderColor={colors.ink}
          style={{ flex: 1 }}
          onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('EditHeart')}
        >
          <Text style={common.btnGhostText}>하트 다시 그리기</Text>
        </SketchyButton>
      </View>
      <View style={[styles.tabbar, { borderBottomWidth: 0 }]}>
        <Pressable style={styles.tabBtn} onPress={() => setTab('posts')}>
          <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>내 게시물</Text>
          <View style={[styles.tabIndicator, tab === 'posts' && styles.tabIndicatorActive]} />
        </Pressable>
        <Pressable style={styles.tabBtn} onPress={() => setTab('likes')}>
          <Text style={[styles.tabText, tab === 'likes' && styles.tabTextActive]}>좋아요한 게시물</Text>
          <View style={[styles.tabIndicator, tab === 'likes' && styles.tabIndicatorActive]} />
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

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    profileCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    name: { fontSize: 17, fontWeight: '800', color: colors.ink },
    handle: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
    stats: { flexDirection: 'row', gap: 16, marginLeft: 'auto', alignItems: 'center' },
    statItem: { alignItems: 'center' },
    statNum: { fontSize: 16, fontWeight: '800', color: colors.ink },
    statLabel: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
    bioBlock: { minHeight: 38, justifyContent: 'center', marginBottom: 22, paddingHorizontal: 2 },
    bio: { fontSize: 13, lineHeight: 19, color: colors.ink },
    bioPlaceholder: { color: colors.inkSoft },
    actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 26 },
    tabbar: { flexDirection: 'row', marginBottom: 8 },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
    tabText: { fontSize: 13, color: colors.muted, fontWeight: '700' },
    tabTextActive: { color: colors.accent },
    tabIndicator: { marginTop: 4, height: 2, width: '60%', borderRadius: 1, backgroundColor: 'transparent' },
    tabIndicatorActive: { backgroundColor: colors.accent },
    emptyNote: { textAlign: 'center', color: colors.inkSoft, fontSize: 13, marginTop: 30, paddingHorizontal: 20 },
    cell: { flex: 1 / 3, aspectRatio: 1, margin: GRID_GAP, backgroundColor: colors.paper2, borderRadius: radius.md, overflow: 'hidden' }
  });
}
