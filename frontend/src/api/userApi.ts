import { supabase } from '@/lib/supabaseClient';
import { SEED_USERS } from '@/mock/store';
import type { UserSummary } from '@/types';

export async function updateHeart(userId: string, heartUrl: string): Promise<void> {
  if (!supabase) return; // 목업 모드: 로컬 상태만 갱신되고 새로고침하면 사라집니다.
  const { error } = await supabase.from('profiles').update({ heart_url: heartUrl }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function updateAvatar(userId: string, avatarUrl: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
  if (error) throw new Error(error.message);
}

/** query가 비어있으면 최근 유저 목록을, 아니면 아이디/닉네임으로 필터링해 돌려줍니다. */
export async function searchUsers(query: string, excludeUserId: string): Promise<UserSummary[]> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백 (실제 id가 없어 대화 시작은 불가)
    return SEED_USERS.map((u) => ({ id: `seed-${u.nickname}`, username: u.nickname, nickname: u.nickname, avatarColor: u.color, avatarUrl: null }));
  }

  let request = supabase.from('profiles').select('id, username, nickname, avatar_color, avatar_url').neq('id', excludeUserId).limit(20);
  const trimmed = query.trim();
  if (trimmed) request = request.or(`username.ilike.%${trimmed}%,nickname.ilike.%${trimmed}%`);

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ id: p.id, username: p.username, nickname: p.nickname, avatarColor: p.avatar_color, avatarUrl: p.avatar_url }));
}

export async function fetchProfile(userId: string): Promise<UserSummary | undefined> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태에서는 실제 유저 id로 프로필을 조회할 수 없음
    return undefined;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, nickname, avatar_color, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { id: data.id, username: data.username, nickname: data.nickname, avatarColor: data.avatar_color, avatarUrl: data.avatar_url } : undefined;
}
