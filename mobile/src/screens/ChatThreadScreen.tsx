// Ported from frontend/src/pages/ChatThreadPage.tsx — keep in sync.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '@/components/Avatar';
import Sketchy from '@/components/Sketchy';
import SketchyInput from '@/components/SketchyInput';
import SketchyLine from '@/components/SketchyLine';
import { useBottomInset } from '@/lib/useBottomInset';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
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
  const { openViewer, openViewerForMessage } = useOverlay();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const bottomInset = useBottomInset();
  // KeyboardAvoidingView already shifts this whole screen above the keyboard
  // — the extra bottomInset padding below is only needed to clear the
  // system nav bar, which the keyboard already covers once it's up, so
  // stacking both left a visible gap between the input row and the keyboard.
  const keyboardHeight = useKeyboardHeight();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const chat = getChat(chatId);
  // The chat list only ever caches the single latest message per
  // conversation (see chatApi.fetchConversations), so `chat` here starts out
  // as that 1-message preview and then gets replaced with the full thread
  // once loadThread resolves. Rather than showing that partial preview (and
  // then popping to the full thread) or hiding everything with opacity:0
  // (which just looked like the screen had frozen for however long the
  // fetch took), we show a plain spinner until the full thread is ready and
  // go straight from "loading" to "the real thing, already at the bottom" —
  // no intermediate state to flash or jump from.
  //
  // (An `inverted` FlatList was tried as a scroll-free alternative but RN's
  // inverted implementation flips the whole list via a scaleY transform,
  // which also flips glyph rendering inside Text on this RN version — text
  // came out upside down. Reverted; this explicit scroll approach is the
  // one that actually works.)
  const [threadReady, setThreadReady] = useState(false);

  useEffect(() => {
    setThreadReady(false);
    void loadThread(chatId).then(() => setThreadReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // `onContentSizeChange` (on the FlatList below) was the only scroll
  // trigger, but apparently doesn't reliably fire on this RN version/device
  // for the FlatList's very first mount, leaving it sitting at its default
  // position (top = oldest message) instead of jumping to the bottom. This
  // effect is a second, independent trigger that fires as soon as the
  // FlatList exists — the short delay gives Android one frame to finish
  // laying out the (fully-rendered, see initialNumToRender below) content
  // before we ask it to scroll.
  useEffect(() => {
    if (!threadReady) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(timer);
  }, [threadReady]);

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
      <SafeAreaView style={[common.screen, { paddingBottom: bottomInset }]} edges={['top']}>
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
          ) : m.type === 'post' ? (
            <Pressable
              style={{ width: 160, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper }}
              onPress={() => {
                // Goes to the real post page (live caption, likes/comments,
                // "본인 글이면 삭제하기") — falls back to the message's own
                // send-time snapshot only if the original post is gone
                // (post_id is set null on delete, so there's nowhere to go).
                if (m.postId) {
                  navigation.navigate('PostDetail', { postId: m.postId });
                } else {
                  openViewer({ image: m.image ?? '', caption: m.text ?? '' });
                }
              }}
            >
              <View>
                <Image source={{ uri: m.image }} style={{ width: 160, height: 160 }} resizeMode="cover" resizeMethod="resize" />
                <View style={{ position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(20,17,12,0.55)', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Icon name="send" size={10} color="#fff" />
                  <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>게시물</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.ink, padding: 8, maxWidth: 160 }} numberOfLines={2}>
                {m.text || '게시물 보기'}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => openViewerForMessage(m)}>
              {/* Air-write captures are saved large (up to 960px, for the
                  full-screen viewer) but only need to fill this 160px
                  thumbnail — resizeMethod="resize" tells Android to decode a
                  sampled-down bitmap instead of decoding full-res and then
                  scaling it, which is what was making the thread janky. */}
              <Image source={{ uri: m.image }} style={airImageStyle} resizeMode="cover" resizeMethod="resize" />
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
    <SafeAreaView style={common.screen} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
          <Pressable style={{ width: 36, height: 36, justifyContent: 'center' }} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={24} color={colors.ink} />
          </Pressable>
          <Avatar nickname={chat.name} color={chat.color} size={34} fontSize={12} avatarUrl={chat.avatarUrl} />
          <Text style={{ fontWeight: '800', color: colors.ink, fontSize: 15 }}>{chat.name}</Text>
        </View>
        <SketchyLine seed="chat-thread-header" />

        {threadReady ? (
          <FlatList
            ref={listRef}
            data={chat.messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 0 }}
            // FlatList only renders/measures the first `initialNumToRender`
            // items (default 10) on mount — for a thread with more messages
            // than that, onContentSizeChange's first fire reflected only
            // that partial (oldest-first) content, so scrollToEnd landed
            // around message #10 instead of the true latest one. Rendering
            // everything up front guarantees the size measured is the real
            // total height.
            initialNumToRender={chat.messages.length}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.muted} />
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, paddingBottom: 10 + (keyboardHeight > 0 ? 0 : bottomInset) }}>
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
