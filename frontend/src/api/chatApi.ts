import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { uploadChatImage } from '@/lib/uploadImage';
import { mockStore } from '@/mock/store';
import type { Chat, ChatMessage, StrokePoint } from '@/types';

interface MessageRow {
  id: number;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'air' | 'post';
  text: string | null;
  image_url: string | null;
  strokes: StrokePoint[] | null;
  post_id: string | null;
  created_at: string;
}

interface ProfileLite {
  id: string;
  nickname: string;
  avatar_color: string;
  avatar_url: string | null;
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
    postId: row.type === 'post' ? row.post_id : undefined,
    time: formatMessageTime(row.created_at),
    createdAt: row.created_at
  };
}

async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, ProfileLite>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase!.from('profiles').select('id, nickname, avatar_color, avatar_url').in('id', userIds);
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

  const conversationIds = convRows.map((c) => c.id);
  const [{ data: msgRows }, { data: readRows }] = await Promise.all([
    supabase.from('messages').select('*').in('conversation_id', conversationIds).order('created_at', { ascending: false }),
    supabase.from('conversation_reads').select('conversation_id, last_read_at').eq('user_id', currentUserId).in('conversation_id', conversationIds)
  ]);

  const latestByConversation = new Map<string, MessageRow>();
  (msgRows ?? []).forEach((row) => {
    if (!latestByConversation.has(row.conversation_id)) latestByConversation.set(row.conversation_id, row as MessageRow);
  });
  const myReadAtByConversation = new Map<string, string>();
  (readRows ?? []).forEach((row) => myReadAtByConversation.set(row.conversation_id, row.last_read_at));

  // 아직 메시지를 한 번도 안 보낸 대화방(채팅하기만 누르고 나간 경우)은 채팅 목록에 안 보이게 걸러냅니다.
  // 최근 메시지 순으로 정렬 — conversations 쿼리 자체엔 정렬이 없어서, 안 해주면 목록 순서가
  // 매번 바뀌어 보이는(가장 최근 채팅이 위에 안 오는) 문제가 있었습니다.
  const startedConvRows = convRows
    .filter((c) => latestByConversation.has(c.id))
    .sort((a, b) => {
      const at = new Date(latestByConversation.get(a.id)!.created_at).getTime();
      const bt = new Date(latestByConversation.get(b.id)!.created_at).getTime();
      return bt - at;
    });
  const otherIds = startedConvRows.map((c) => (c.user_a === currentUserId ? c.user_b : c.user_a));
  const profiles = await fetchProfilesByIds(otherIds);

  return startedConvRows.map((c) => {
    const otherId = c.user_a === currentUserId ? c.user_b : c.user_a;
    const profile = profiles.get(otherId);
    const latest = latestByConversation.get(c.id)!;
    const myReadAt = myReadAtByConversation.get(c.id);
    const unread = latest.sender_id !== currentUserId && (!myReadAt || new Date(latest.created_at) > new Date(myReadAt));
    return {
      id: c.id,
      name: profile?.nickname ?? '알 수 없음',
      color: profile?.avatar_color ?? '#EAE2C9',
      avatarUrl: profile?.avatar_url ?? null,
      otherUserId: otherId,
      messages: [mapMessage(latest, currentUserId)],
      otherReadAt: null, // 목록에서는 안 씀 — 스레드를 열면 fetchThread가 채워줍니다.
      unread
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

  const { data: readRow } = await supabase
    .from('conversation_reads')
    .select('last_read_at')
    .eq('conversation_id', chatId)
    .eq('user_id', otherId)
    .maybeSingle();

  return {
    id: conv.id,
    name: profile?.nickname ?? '알 수 없음',
    color: profile?.avatar_color ?? '#EAE2C9',
    avatarUrl: profile?.avatar_url ?? null,
    otherUserId: otherId,
    messages: (msgRows ?? []).map((row) => mapMessage(row as MessageRow, currentUserId)),
    otherReadAt: readRow?.last_read_at ?? null,
    unread: false // 스레드를 여는 것 자체가 읽는 행위라 항상 false — markThreadRead가 뒤이어 호출됩니다.
  };
}

/** 대화방을 볼 때마다 호출해서 "내가 여기까지 읽었다"는 시각을 저장합니다 (상대방 화면에 읽음 표시로 반영). */
export async function markThreadRead(chatId: string, currentUserId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('conversation_reads')
    .upsert({ conversation_id: chatId, user_id: currentUserId, last_read_at: new Date().toISOString() }, { onConflict: 'conversation_id,user_id' });
  if (error) throw new Error(error.message);
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
    const message: ChatMessage = { id: Date.now(), from: 'me', type: 'text', text, time: '방금', createdAt: new Date().toISOString() };
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
    const message: ChatMessage = {
      id: Date.now(),
      from: 'me',
      type: 'air',
      image: imageDataUrl,
      strokes,
      time: '방금',
      createdAt: new Date().toISOString()
    };
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

/** 게시물을 채팅으로 공유합니다 — 게시물 이미지는 이미 공개 버킷의 URL이라 재업로드 없이 그대로 참조합니다. */
export async function sendPostMessage(
  chatId: string,
  currentUserId: string,
  post: { id: string; image: string; caption: string }
): Promise<ChatMessage | undefined> {
  if (!supabase) {
    const message: ChatMessage = {
      id: Date.now(),
      from: 'me',
      type: 'post',
      image: post.image,
      text: post.caption,
      postId: post.id,
      time: '방금',
      createdAt: new Date().toISOString()
    };
    return mockStore.sendMessage(chatId, message) ? message : undefined;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: chatId, sender_id: currentUserId, type: 'post', image_url: post.image, text: post.caption, post_id: post.id })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? '메시지를 보내지 못했어요');
  return mapMessage(data as MessageRow, currentUserId);
}

/**
 * 앱 전역에서 (지금 보고 있는 대화방이 아니어도) 내가 받는 새 메시지가 생기면 알려줍니다 —
 * 채팅 아이콘의 안읽음 빨간 점용. 특정 대화방으로 필터링하지 않고 messages 테이블 전체를
 * 구독한 뒤 발신자만 클라이언트에서 걸러냅니다 (Supabase realtime 필터는 IN 리스트를
 * 지원하지 않아, "내가 속한 대화방들"로 서버 필터링은 못 함). 반환값을 호출하면 구독 해제됩니다.
 */
export function subscribeToNewMessages(currentUserId: string, onMessage: () => void): () => void {
  if (!supabase) return () => {};

  const client = supabase;
  const channel: RealtimeChannel = client
    .channel(`messages:inbox:${currentUserId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const row = payload.new as MessageRow;
      if (row.sender_id !== currentUserId) onMessage();
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/**
 * 열려있는 대화방에 새 메시지가 오거나(onMessage) 상대방이 읽음 표시를 갱신하면(onRead)
 * 실시간으로 알려줍니다. 반환값을 호출하면 구독이 해제됩니다.
 */
export function subscribeToThread(
  chatId: string,
  currentUserId: string,
  onMessage: (message: ChatMessage) => void,
  onRead?: (readAt: string) => void
): () => void {
  if (!supabase) return () => {};

  const client = supabase;
  const channel: RealtimeChannel = client
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chatId}` },
      (payload) => onMessage(mapMessage(payload.new as MessageRow, currentUserId))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversation_reads', filter: `conversation_id=eq.${chatId}` },
      (payload) => {
        const row = payload.new as { user_id: string; last_read_at: string } | undefined;
        if (row && row.user_id !== currentUserId) onRead?.(row.last_read_at);
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
