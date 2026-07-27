// Ported from frontend/src/pages/UserProfilePage.tsx — keep in sync.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import * as followApi from '@/api/followApi';
import * as userApi from '@/api/userApi';
import type { FollowCounts } from '@/api/followApi';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';
import { colors } from '@/theme/colors';
import { common } from '@/theme/common';
import type { UserSummary } from '@/types';

type Props = NativeStackScreenProps<AppStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { session, posts, startConversationWith } = useAppState();
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
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
        <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={colors.ink} />
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
          <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 16 }}>
            <Avatar nickname={profile.nickname} color={profile.avatarColor} size={64} fontSize={24} avatarUrl={profile.avatarUrl} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 8 }}>{profile.nickname}</Text>
            <Text style={{ fontSize: 12, color: colors.inkSoft }}>@{profile.username}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, marginBottom: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{postCount}</Text>
              <Text style={{ fontSize: 11, color: colors.inkSoft }}>게시물</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{counts.followers}</Text>
              <Text style={{ fontSize: 11, color: colors.inkSoft }}>팔로워</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{counts.following}</Text>
              <Text style={{ fontSize: 11, color: colors.inkSoft }}>팔로잉</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              style={[common.btn, following ? common.btnGhost : common.btnPrimary, { flex: 1 }, busy && common.btnDisabled]}
              disabled={busy}
              onPress={handleToggleFollow}
            >
              <Text style={following ? common.btnGhostText : common.btnPrimaryText}>{following ? '팔로잉' : '팔로우'}</Text>
            </Pressable>
            <Pressable style={[common.btn, common.btnGhost, { flex: 1 }]} onPress={handleChat}>
              <Text style={common.btnGhostText}>채팅하기</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
