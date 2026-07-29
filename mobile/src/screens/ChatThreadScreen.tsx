// Ported from frontend/src/pages/ChatThreadPage.tsx — keep in sync.
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import Sketchy from '@/components/Sketchy';
import SketchyInput from '@/components/SketchyInput';
import SketchyLine from '@/components/SketchyLine';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import { useToast } from '@/state/ToastContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';
import type { ChatMessage } from '@/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ChatThread'>;

function isSameDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateDivider(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(iso));
}

export default function ChatThreadScreen({ navigation, route }: Props) {
  const { chatId } = route.params;
  const { loadThread, sendText, getChat, subscribeToThread, markThreadRead } = useAppState();
  const { openViewerForMessage } = useOverlay();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const chat = getChat(chatId);

  useEffect(() => {
    void loadThread(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    const unsubscribe = subscribeToThread(chatId);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    if (chat) void markThreadRead(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, chat?.messages.length]);

  const lastReadMineId = useMemo(() => {
    if (!chat?.otherReadAt) return null;
    const readAt = new Date(chat.otherReadAt).getTime();
    let result: number | null = null;
    chat.messages.forEach((m) => {
      if (m.from === 'me' && new Date(m.createdAt).getTime() <= readAt) result = m.id;
    });
    return result;
  }, [chat]);

  async function handleSend() {
    if (!text.trim()) return;
    const value = text.trim();
    setText('');
    try {
      await sendText(chatId, value);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '메시지를 보내지 못했어요');
    }
  }

  if (!chat) {
    return (
      <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
        <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={24} color={colors.ink} />
        </Pressable>
      </SafeAreaView>
    );
  }

  function renderItem({ item: m, index }: { item: ChatMessage; index: number }) {
    const showDateDivider = index === 0 || !isSameDay(chat!.messages[index - 1].createdAt, m.createdAt);
    const mine = m.from === 'me';
    return (
      <View>
        {showDateDivider ? <Text style={{ textAlign: 'center', fontSize: 11, color: colors.inkSoft, marginVertical: 6 }}>{formatDateDivider(m.createdAt)}</Text> : null}
        <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
          {m.type === 'text' ? (
            <Sketchy
              shape="blob"
              variant={mine ? 'a' : 'b'}
              color={mine ? 'transparent' : colors.border}
              fill={mine ? colors.accent : colors.paper}
              strokeWidth={1.4}
              seed={`bubble-${m.id}`}
              style={bubbleStyle}
            >
              {/* Mine bubble is always accent red, so its text stays fixed
                  white regardless of theme (not colors.paper, which flips to
                  black in dark mode and would vanish on the red fill). */}
              <Text style={{ color: mine ? '#fff' : colors.ink, fontSize: 14 }}>{m.text}</Text>
            </Sketchy>
          ) : (
            <Pressable onPress={() => openViewerForMessage(m)}>
              <Image source={{ uri: m.image }} style={airImageStyle} />
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            {mine && m.id === lastReadMineId ? <Text style={{ fontSize: 10, color: colors.inkSoft }}>읽음</Text> : null}
            <Text style={{ fontSize: 10, color: colors.inkSoft }}>{m.time}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
          <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={24} color={colors.ink} />
          </Pressable>
          <Avatar nickname={chat.name} color={chat.color} size={34} fontSize={12} avatarUrl={chat.avatarUrl} />
          <Text style={{ fontWeight: '800', color: colors.ink, fontSize: 15 }}>{chat.name}</Text>
        </View>
        <SketchyLine seed="chat-thread-header" />

        <FlatList
          ref={listRef}
          data={chat.messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 10 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
          <Pressable onPress={() => navigation.navigate('Airwrite', { chatId })} accessibilityLabel="에어라이팅 메시지">
            <Sketchy radius={20} color={colors.line} strokeWidth={2} seed="chat-round-edit" style={[roundIconStyle, { backgroundColor: colors.paper }]}>
              <Icon name="edit-2" size={18} color={colors.ink} />
            </Sketchy>
          </Pressable>
          <SketchyInput
            style={{ flex: 1 }}
            placeholder="메시지 보내기..."
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
          />
          <Pressable onPress={handleSend} accessibilityLabel="전송">
            <Sketchy radius={20} color={colors.paper} seed="chat-round-send" style={[roundIconStyle, { backgroundColor: colors.ink, borderWidth: 0 }]}>
              <Icon name="send" size={20} color={colors.paper} />
            </Sketchy>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const bubbleStyle = { maxWidth: '78%' as const, paddingHorizontal: 14, paddingVertical: 9 };
const airImageStyle = { width: 160, height: 160, borderRadius: radius.md };
const roundIconStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center' as const,
  justifyContent: 'center' as const
};
