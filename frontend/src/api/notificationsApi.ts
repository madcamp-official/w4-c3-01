// Ported to mobile/src/api/notificationsApi.ts — keep in sync.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Notification } from '@/types';

interface NotificationRow {
  id: number;
  recipient_id: string;
  actor_id: string;
  type: 'like' | 'follow';
  post_id: string | null;
  read: boolean;
  created_at: string;
}

interface ProfileLite {
  id: string;
  nickname: string;
  avatar_color: string;
  avatar_url: string | null;
}

function formatNotificationTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(iso));
}

async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, ProfileLite>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase!.from('profiles').select('id, nickname, avatar_color, avatar_url').in('id', userIds);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.id, p as ProfileLite]));
}

function mapNotification(row: NotificationRow, profiles: Map<string, ProfileLite>): Notification {
  const actor = profiles.get(row.actor_id);
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: actor?.nickname ?? '알 수 없음',
    actorAvatarColor: actor?.avatar_color ?? '#EAE2C9',
    actorAvatarUrl: actor?.avatar_url ?? null,
    type: row.type,
    postId: row.type === 'like' ? row.post_id : undefined,
    read: row.read,
    time: formatNotificationTime(row.created_at),
    createdAt: row.created_at
  };
}

export async function fetchNotifications(currentUserId: string): Promise<Notification[]> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백 — 알림은 아직 목업 데이터가 없어 빈 목록.
    return [];
  }

  const { data: rows, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', currentUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return [];

  const actorIds = new Set<string>(rows.map((r) => r.actor_id));
  const profiles = await fetchProfilesByIds([...actorIds]);

  return (rows as NotificationRow[]).map((row) => mapNotification(row, profiles));
}

/** 화면을 열 때 호출해서 안 읽은 알림을 전부 읽음 처리합니다 (채팅방 진입 시 markThreadRead와 동일한 패턴). */
export async function markAllNotificationsRead(currentUserId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', currentUserId)
    .eq('read', false);
  if (error) throw new Error(error.message);
}

/** 알림 벨의 빨간 점을 실시간으로 갱신하기 위한 구독. 반환값을 호출하면 구독 해제됩니다. */
export function subscribeToNewNotifications(currentUserId: string, onNotification: () => void): () => void {
  if (!supabase) return () => {};

  const client = supabase;
  const channel: RealtimeChannel = client
    .channel(`notifications:${currentUserId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${currentUserId}` },
      () => onNotification()
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/** 이 기기의 Expo 푸시 토큰을 등록합니다 (모바일 전용 — mobile/src/lib/pushNotifications.ts에서 호출. 웹은 아직 브라우저 푸시를 지원하지 않아 호출하지 않습니다). */
export async function registerPushToken(currentUserId: string, token: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: currentUserId, token, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
