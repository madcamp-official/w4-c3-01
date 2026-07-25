import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { uploadChatImage } from '@/lib/uploadImage';
import { mockStore } from '@/mock/store';
import type { Chat, ChatMessage, StrokePoint } from '@/types';

interface MessageRow {
  id: number;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'air';
  text: string | null;
  image_url: string | null;
  strokes: StrokePoint[] | null;
  created_at: string;
}

interface ProfileLite {
  id: string;
  nickname: string;
  avatar_color: string;
}

function formatMessageTime(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
}

function mapMessage(row: MessageRow, currentUserId: string): ChatMessage {
  return {
    id: row.id,
    from: row.sender_id === currentUserId ? 'me' : 'them',
    type: row.type,
    text: row.text ?? undefined,
    image: row.image_url ?? undefined,
    strokes: row.strokes ?? undefined,
    time: formatMessageTime(row.created_at)
  };
}

async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, ProfileLite>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase!.from('profiles').select('id, nickname, avatar_color').in('id', userIds);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.id, p as ProfileLite]));
}

export async function fetchConversations(currentUserId: string): Promise<Chat[]> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백
    mockStore.ensureSeeded();
    return mockStore.chats;
  }

  const { data: convRows, error } = await supabase
    .from('conversations')
    .select('id, user_a, user_b')
    .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);
  if (error) throw new Error(error.message);
  if (!convRows || convRows.length === 0) return [];

  const otherIds = convRows.map((c) => (c.user_a === currentUserId ? c.user_b : c.user_a));
  const profiles = await fetchProfilesByIds(otherIds);

  const conversationIds = convRows.map((c) => c.id);
  const { data: msgRows } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  const latestByConversation = new Map<string, MessageRow>();
  (msgRows ?? []).forEach((row) => {
    if (!latestByConversation.has(row.conversation_id)) latestByConversation.set(row.conversation_id, row as MessageRow);
  });

  return convRows.map((c) => {
    const otherId = c.user_a === currentUserId ? c.user_b : c.user_a;
    const profile = profiles.get(otherId);
    const latest = latestByConversation.get(c.id);
    return {
      id: c.id,
      name: profile?.nickname ?? '알 수 없음',
      color: profile?.avatar_color ?? '#EAE2C9',
      messages: latest ? [mapMessage(latest, currentUserId)] : []
    };
  });
}

export async function fetchThread(chatId: string, currentUserId: string): Promise<Chat | undefined> {
  if (!supabase) {
    mockStore.ensureSeeded();
    return mockStore.chats.find((c) => c.id === chatId);
  }

  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, user_a, user_b')
    .eq('id', chatId)
    .single();
  if (convError || !conv) return undefined;

  const otherId = conv.user_a === currentUserId ? conv.user_b : conv.user_a;
  const profiles = await fetchProfilesByIds([otherId]);
  const profile = profiles.get(otherId);

  const { data: msgRows, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', chatId)
    .order('created_at', { ascending: true });
  if (msgError) throw new Error(msgError.message);

  return {
    id: conv.id,
    name: profile?.nickname ?? '알 수 없음',
    color: profile?.avatar_color ?? '#EAE2C9',
    messages: (msgRows ?? []).map((row) => mapMessage(row as MessageRow, currentUserId))
  };
}

/** 두 사람 사이의 대화방을 찾고, 없으면 새로 만듭니다. Supabase가 없으면 null (검색에서 준비 중 토스트로 처리). */
export async function findOrCreateConversation(currentUserId: string, otherUserId: string): Promise<string | null> {
  if (!supabase) return null;

  const [userA, userB] = [currentUserId, otherUserId].sort();

  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({ user_a: userA, user_b: userB })
    .select('id')
    .single();
  if (!createError && created) return created.id;

  // 두 사용자가 동시에 대화를 시작해 unique 제약에 걸린 경우, 방금 생긴 대화를 다시 조회.
  const { data: retry } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();
  if (retry) return retry.id;

  throw new Error(createError?.message ?? '대화를 시작하지 못했어요');
}

export async function sendTextMessage(chatId: string, currentUserId: string, text: string): Promise<ChatMessage | undefined> {
  if (!supabase) {
    const message: ChatMessage = { id: Date.now(), from: 'me', type: 'text', text, time: '방금' };
    return mockStore.sendMessage(chatId, message) ? message : undefined;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: chatId, sender_id: currentUserId, type: 'text', text })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? '메시지를 보내지 못했어요');
  return mapMessage(data as MessageRow, currentUserId);
}

export async function sendAirMessage(
  chatId: string,
  currentUserId: string,
  imageDataUrl: string,
  strokes: StrokePoint[]
): Promise<ChatMessage | undefined> {
  if (!supabase) {
    const message: ChatMessage = { id: Date.now(), from: 'me', type: 'air', image: imageDataUrl, strokes, time: '방금' };
    return mockStore.sendMessage(chatId, message) ? message : undefined;
  }

  const imageUrl = await uploadChatImage(currentUserId, imageDataUrl);
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: chatId, sender_id: currentUserId, type: 'air', image_url: imageUrl, strokes })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? '메시지를 보내지 못했어요');
  return mapMessage(data as MessageRow, currentUserId);
}

/** 열려있는 대화방에 새 메시지가 오면 실시간으로 알려줍니다. 반환값을 호출하면 구독이 해제됩니다. */
export function subscribeToThread(chatId: string, currentUserId: string, onMessage: (message: ChatMessage) => void): () => void {
  if (!supabase) return () => {};

  const client = supabase;
  const channel: RealtimeChannel = client
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chatId}` },
      (payload) => onMessage(mapMessage(payload.new as MessageRow, currentUserId))
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
