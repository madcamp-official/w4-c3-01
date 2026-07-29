// Ported from frontend/src/pages/UserProfilePage.tsx — keep in sync.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import SketchyButton from '@/components/SketchyButton';
import * as followApi from '@/api/followApi';
import * as postsApi from '@/api/postsApi';
import * as userApi from '@/api/userApi';
import type { FollowCounts } from '@/api/followApi';
import { useBottomInset } from '@/lib/useBottomInset';
import { useAppState } from '@/state/AppStateContext';
import type { AppStackParamList } from '@/navigation/types';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';
import type { Post, UserSummary } from '@/types';

// Same numColumns-grid fix as MyScreen.tsx's CELL_SIZE — a fixed width avoids
// FlatList's `flex: 1/3` stretching whichever cells land in a partial last row.
const GRID_GAP = 2;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = (SCREEN_WIDTH - 40 - GRID_GAP * 2 * 3) / 3;

type Props = NativeStackScreenProps<AppStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { session, startConversationWith } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  // This user's own posts only — never their likes, which is what the
  // global (follow-scoped) `posts` state can't show for someone the current
  // user doesn't follow anyway.
  const [authorPosts, setAuthorPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoaded(false);
    setAuthorPosts(null);
    let cancelled = false;
    (async () => {
      const [p, c, isFollowing, userPosts] = await Promise.all([
        userApi.fetchProfile(userId),
        followApi.fetchFollowCounts(userId),
        followApi.isFollowing(session.id, userId),
        postsApi.fetchPostsByAuthor(userId, session.id)
      ]);
      if (cancelled) return;
      setProfile(p ?? null);
      setCounts(c);
      setFollowing(isFollowing);
      setAuthorPosts(userPosts);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, session]);

  const postCount = authorPosts?.length ?? 0;

  function renderCell({ item }: { item: Post }) {
    return (
      <Pressable style={{ width: CELL_SIZE, aspectRatio: 1, margin: GRID_GAP, backgroundColor: colors.paper2, borderRadius: radius.md, overflow: 'hidden' }} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
        <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
      </Pressable>
    );
  }

  async function handleToggleFollow() {
    if (!session) return;
    setBusy(true);
    try {
      if (following) {
        await followApi.unfollowUser(session.id, userId);
        setFollowing(false);
        setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        await followApi.followUser(session.id, userId);
        setFollowing(true);
        setCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '처리하지 못했어요');
    } finally {
      setBusy(false);
    }
  }

  async function handleChat() {
    const chatId = await startConversationWith(userId);
    if (!chatId) {
      showToast('채팅은 아직 준비 중이에요');
      return;
    }
    navigation.navigate('ChatThread', { chatId });
  }

  return (
    <SafeAreaView style={[common.screen, { paddingBottom: bottomInset }]} edges={['top']}>
      <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
        <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </Pressable>
      </View>

      {!loaded ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : !profile ? (
        <Text style={common.subtitle}>사용자를 찾을 수 없어요</Text>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Same row layout as MyScreen's profile-card: outline avatar,
              name+handle beside it, stats pushed to the right — kept in sync
              so a user's own page and other people's pages read the same. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 20 }}>
            <Avatar nickname={profile.nickname} color={profile.avatarColor} size={61} fontSize={20} avatarUrl={profile.avatarUrl} />
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{profile.nickname}</Text>
              <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>@{profile.username}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginLeft: 'auto', alignItems: 'center' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{postCount}</Text>
                <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginTop: 2 }}>게시물</Text>
              </View>
              <Pressable style={{ alignItems: 'center' }} onPress={() => navigation.navigate('FollowList', { userId, mode: 'followers' })}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{counts.followers}</Text>
                <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginTop: 2 }}>팔로워</Text>
              </Pressable>
              <Pressable style={{ alignItems: 'center' }} onPress={() => navigation.navigate('FollowList', { userId, mode: 'following' })}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{counts.following}</Text>
                <Text style={{ fontSize: 12.5, color: colors.inkSoft, marginTop: 2 }}>팔로잉</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SketchyButton
              variant={following ? 'ghost' : 'primary'}
              blobVariant="a"
              style={{ flex: 1 }}
              contentStyle={{ paddingVertical: 9 }}
              disabled={busy}
              onPress={handleToggleFollow}
            >
              <Text style={[following ? common.btnGhostText : common.btnPrimaryText, { fontSize: 13 }]}>
                {following ? '팔로잉' : '팔로우'}
              </Text>
            </SketchyButton>
            <SketchyButton variant="ghost" blobVariant="b" style={{ flex: 1 }} contentStyle={{ paddingVertical: 9 }} onPress={handleChat}>
              <Text style={[common.btnGhostText, { fontSize: 13 }]}>채팅하기</Text>
            </SketchyButton>
          </View>
          {authorPosts && authorPosts.length === 0 ? (
            <Text style={[common.subtitle, { marginTop: 24 }]}>아직 올린 게시물이 없어요</Text>
          ) : (
            <FlatList
              data={authorPosts ?? []}
              keyExtractor={(p) => p.id}
              renderItem={renderCell}
              numColumns={3}
              style={{ marginTop: 20 }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
