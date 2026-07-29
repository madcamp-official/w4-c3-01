// Ported from frontend/src/pages/FollowListPage.tsx — keep in sync.
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import * as followApi from '@/api/followApi';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { useTheme } from '@/state/ThemeContext';
import { buildCommon } from '@/theme/common';
import type { UserSummary } from '@/types';

type Props = NativeStackScreenProps<AppStackParamList, 'FollowList'>;

export default function FollowListScreen({ navigation, route }: Props) {
  const { userId, mode } = route.params;
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();
  const [users, setUsers] = useState<UserSummary[] | null>(null);

  useEffect(() => {
    setUsers(null);
    let cancelled = false;
    const fetcher = mode === 'followers' ? followApi.fetchFollowers : followApi.fetchFollowing;
    fetcher(userId).then((result) => {
      if (!cancelled) setUsers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, mode]);

  return (
    <SafeAreaView style={[common.screen, { paddingBottom: bottomInset }]} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
        <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: '800', color: colors.ink, fontSize: 15 }}>
          {mode === 'followers' ? '팔로워' : '팔로잉'}
        </Text>
        <View style={{ width: 36 }} />
      </View>
      {users === null ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : users.length === 0 ? (
        <Text style={common.subtitle}>{mode === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로우한 사람이 없어요'}</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={({ item: u }) => (
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
              onPress={() => navigation.navigate('UserProfile', { userId: u.id })}
            >
              <Avatar nickname={u.nickname} color={u.avatarColor} size={40} fontSize={14} avatarUrl={u.avatarUrl} />
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{u.nickname}</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkSoft }}>@{u.username}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
