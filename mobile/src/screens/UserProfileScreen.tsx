// Ported from frontend/src/pages/UserProfilePage.tsx — keep in sync.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import SketchyButton from '@/components/SketchyButton';
import * as followApi from '@/api/followApi';
import * as userApi from '@/api/userApi';
import type { FollowCounts } from '@/api/followApi';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { buildCommon } from '@/theme/common';
import type { UserSummary } from '@/types';

type Props = NativeStackScreenProps<AppStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { session, posts, startConversationWith } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoaded(false);
    let cancelled = false;
    (async () => {
      const [p, c, isFollowing] = await Promise.all([
        userApi.fetchProfile(userId),
        followApi.fetchFollowCounts(userId),
        followApi.isFollowing(session.id, userId)
      ]);
      if (cancelled) return;
      setProfile(p ?? null);
      setCounts(c);
      setFollowing(isFollowing);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, session]);

  const postCount = useMemo(() => (profile ? posts.filter((p) => p.authorId === profile.id).length : 0), [posts, profile]);

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
        <>
          {/* Same row layout as MyScreen's profile-card: outline avatar,
              name+handle beside it, stats pushed to the right — kept in sync
              so a user's own page and other people's pages read the same. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 20 }}>
            <Avatar nickname={profile.nickname} color={profile.avatarColor} size={61} fontSize={20} avatarUrl={profile.avatarUrl} outline />
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{profile.nickname}</Text>
              <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>@{profile.username}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginLeft: 'auto', alignItems: 'center' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{postCount}</Text>
                <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>게시물</Text>
              </View>
              <Pressable style={{ alignItems: 'center' }} onPress={() => navigation.navigate('FollowList', { userId, mode: 'followers' })}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{counts.followers}</Text>
                <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>팔로워</Text>
              </Pressable>
              <Pressable style={{ alignItems: 'center' }} onPress={() => navigation.navigate('FollowList', { userId, mode: 'following' })}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{counts.following}</Text>
                <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>팔로잉</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SketchyButton
              variant={following ? 'ghost' : 'primary'}
              blobVariant="a"
              style={{ flex: 1 }}
              disabled={busy}
              onPress={handleToggleFollow}
            >
              <Text style={following ? common.btnGhostText : common.btnPrimaryText}>{following ? '팔로잉' : '팔로우'}</Text>
            </SketchyButton>
            <SketchyButton variant="ghost" blobVariant="b" style={{ flex: 1 }} onPress={handleChat}>
              <Text style={common.btnGhostText}>채팅하기</Text>
            </SketchyButton>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
