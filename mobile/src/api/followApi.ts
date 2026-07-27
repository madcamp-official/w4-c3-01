// Ported from frontend/src/api/followApi.ts — keep in sync.
import { supabase } from '@/lib/supabaseClient';

export interface FollowCounts {
  followers: number;
  following: number;
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
