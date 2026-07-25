import { apiRequest } from '@/api/client';
import { supabase } from '@/lib/supabaseClient';
import { SEED_USERS } from '@/mock/store';
import type { UserSummary } from '@/types';

export async function updateHeart(heartUrl: string): Promise<{ heartUrl: string }> {
  try {
    return await apiRequest<{ heartUrl: string }>('/me/heart', {
      method: 'PUT',
      body: JSON.stringify({ heartUrl })
    });
  } catch {
    // TODO(backend): replace with PUT /me/heart
    return { heartUrl };
  }
}

/** query가 비어있으면 최근 유저 목록을, 아니면 아이디/닉네임으로 필터링해 돌려줍니다. */
export async function searchUsers(query: string, excludeUserId: string): Promise<UserSummary[]> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백 (실제 id가 없어 대화 시작은 불가)
    return SEED_USERS.map((u) => ({ id: `seed-${u.nickname}`, username: u.nickname, nickname: u.nickname, avatarColor: u.color }));
  }

  let request = supabase.from('profiles').select('id, username, nickname, avatar_color').neq('id', excludeUserId).limit(20);
  const trimmed = query.trim();
  if (trimmed) request = request.or(`username.ilike.%${trimmed}%,nickname.ilike.%${trimmed}%`);

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ id: p.id, username: p.username, nickname: p.nickname, avatarColor: p.avatar_color }));
}
