// Ported from frontend/src/pages/NotificationsPage.tsx — keep in sync.
import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { buildCommon } from '@/theme/common';
import type { Notification } from '@/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const { notifications, loadNotifications, markNotificationsRead } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();

  useEffect(() => {
    void loadNotifications();
    void markNotificationsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function messageFor(item: Notification): string {
    return item.type === 'like' ? `${item.actorName}님이 게시물을 좋아합니다` : `${item.actorName}님이 팔로우하기 시작했어요`;
  }

  function handlePress(item: Notification) {
    if (item.type === 'like') {
      if (item.postId) navigation.navigate('PostDetail', { postId: item.postId });
    } else {
      navigation.navigate('UserProfile', { userId: item.actorId });
    }
  }

  function renderRow({ item }: { item: Notification }) {
    return (
      <Pressable
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}
        onPress={() => handlePress(item)}
      >
        <Avatar nickname={item.actorName} color={item.actorAvatarColor} size={46} fontSize={16} avatarUrl={item.actorAvatarUrl} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: colors.ink }}>{messageFor(item)}</Text>
          <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>{item.time}</Text>
        </View>
        {!item.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} /> : null}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 }}>
        <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>알림</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(n) => String(n.id)}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.line }} />}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        ListEmptyComponent={<Text style={{ color: colors.inkSoft, fontSize: 13, paddingVertical: 20 }}>아직 알림이 없어요</Text>}
      />
    </SafeAreaView>
  );
}
