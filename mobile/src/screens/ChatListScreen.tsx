// Ported from frontend/src/pages/ChatListPage.tsx — keep in sync.
import { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { buildCommon } from '@/theme/common';
import type { Chat } from '@/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ChatList'>;

export default function ChatListScreen({ navigation }: Props) {
  const { chats, loadChats } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();

  // A plain mount-only effect only re-fetched once — native-stack keeps this
  // screen mounted underneath ChatThread, so coming back after sending a
  // message never refreshed the (now stale) order and the most recent chat
  // wouldn't be on top. useFocusEffect re-fetches every time this screen is
  // shown again, not just on first mount.
  useFocusEffect(
    useCallback(() => {
      void loadChats();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function renderRow({ item }: { item: Chat }) {
    const lastMsg = item.messages[item.messages.length - 1];
    const preview = !lastMsg ? '대화를 시작해보세요' : lastMsg.type === 'text' ? lastMsg.text : '✏️ 손글씨 메시지';
    return (
      <Pressable
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}
        onPress={() => navigation.navigate('ChatThread', { chatId: item.id })}
      >
        <Avatar nickname={item.name} color={item.color} size={46} fontSize={16} avatarUrl={item.avatarUrl} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.ink, fontSize: 14 }}>{item.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: colors.inkSoft }}>
            {preview}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.inkSoft }}>{lastMsg?.time}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 }}>
        <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>채팅</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.line }} />}
        contentContainerStyle={{ paddingBottom: bottomInset }}
      />
    </SafeAreaView>
  );
}
