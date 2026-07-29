import { supabase } from '@/lib/supabaseClient';
import type { UserSummary } from '@/types';

export interface FollowCounts {
  followers: number;
  following: number;
}

async function fetchProfilesByIds(ids: string[]): Promise<UserSummary[]> {
  if (!supabase || !ids.length) return [];
  const { data, error } = await supabase.from('profiles').select('id, username, nickname, avatar_color, avatar_url').in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ id: p.id, username: p.username, nickname: p.nickname, avatarColor: p.avatar_color, avatarUrl: p.avatar_url }));
}

/** userId를 팔로우하는 사람들 목록. */
export async function fetchFollowers(userId: string): Promise<UserSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('follows').select('follower_id').eq('following_id', userId);
  if (error) throw new Error(error.message);
  return fetchProfilesByIds((data ?? []).map((row) => row.follower_id as string));
}

/** userId가 팔로우하는 사람들 목록. */
export async function fetchFollowing(userId: string): Promise<UserSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
  if (error) throw new Error(error.message);
  return fetchProfilesByIds((data ?? []).map((row) => row.following_id as string));
}

export async function fetchFollowCounts(userId: string): Promise<FollowCounts> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백
    return { followers: 128, following: 96 };
  }

  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
  ]);
  if (followersRes.error) throw new Error(followersRes.error.message);
  if (followingRes.error) throw new Error(followingRes.error.message);

  return { followers: followersRes.count ?? 0, following: followingRes.count ?? 0 };
}

export async function fetchFollowingIds(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.following_id as string);
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
  if (error) throw new Error(error.message);
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
  if (error) throw new Error(error.message);
}
