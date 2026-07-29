import { fetchFollowingIds } from '@/api/followApi';
import { supabase } from '@/lib/supabaseClient';
import { uploadPostImage } from '@/lib/uploadImage';
import { mockStore } from '@/mock/store';
import type { Comment, Post, StrokePoint } from '@/types';

interface PostRow {
  id: string;
  author_id: string;
  image_url: string;
  strokes: StrokePoint[] | null;
  drawing: Post['drawing'] | null;
  caption: string;
  created_at: string;
}

interface ProfileLite {
  id: string;
  nickname: string;
  avatar_color: string;
  avatar_url: string | null;
}

interface LikeRow {
  post_id: string;
  user_id: string;
}

interface CommentRow {
  id: number;
  post_id: string;
  author_id: string;
  text: string;
  created_at: string;
}

function formatPostTime(iso: string): string {
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

async function fetchLikesAndComments(postIds: string[]) {
  const likesByPost = new Map<string, LikeRow[]>();
  const commentsByPost = new Map<string, CommentRow[]>();
  if (postIds.length === 0) return { likesByPost, commentsByPost };

  const [{ data: likeRows, error: likeError }, { data: commentRows, error: commentError }] = await Promise.all([
    supabase!.from('post_likes').select('post_id, user_id').in('post_id', postIds),
    supabase!.from('post_comments').select('*').in('post_id', postIds).order('created_at', { ascending: true })
  ]);
  if (likeError) throw new Error(likeError.message);
  if (commentError) throw new Error(commentError.message);

  (likeRows ?? []).forEach((row) => {
    const list = likesByPost.get(row.post_id) ?? [];
    list.push(row as LikeRow);
    likesByPost.set(row.post_id, list);
  });
  (commentRows ?? []).forEach((row) => {
    const list = commentsByPost.get(row.post_id) ?? [];
    list.push(row as CommentRow);
    commentsByPost.set(row.post_id, list);
  });
  return { likesByPost, commentsByPost };
}

function assemblePosts(
  rows: PostRow[],
  profiles: Map<string, ProfileLite>,
  likesByPost: Map<string, LikeRow[]>,
  commentsByPost: Map<string, CommentRow[]>,
  currentUserId: string
): Post[] {
  return rows.map((row) => {
    const profile = profiles.get(row.author_id);
    const likes = likesByPost.get(row.id) ?? [];
    const comments = commentsByPost.get(row.id) ?? [];
    return {
      id: row.id,
      authorId: row.author_id,
      username: profile?.nickname ?? '알 수 없음',
      avatarColor: profile?.avatar_color ?? '#EAE2C9',
      avatarUrl: profile?.avatar_url ?? null,
      time: formatPostTime(row.created_at),
      image: row.image_url,
      strokes: row.strokes ?? [],
      drawing: row.drawing ?? undefined,
      caption: row.caption,
      liked: likes.some((l) => l.user_id === currentUserId),
      likes: likes.length,
      comments: comments.map((c) => ({
        user: profiles.get(c.author_id)?.nickname ?? '알 수 없음',
        text: c.text,
        avatarColor: profiles.get(c.author_id)?.avatar_color ?? '#EAE2C9',
        avatarUrl: profiles.get(c.author_id)?.avatar_url ?? null
      })),
      mine: row.author_id === currentUserId
    };
  });
}

async function fetchSinglePost(postId: string, currentUserId: string): Promise<Post | undefined> {
  const { data: row, error } = await supabase!.from('posts').select('*').eq('id', postId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return undefined;

  const { likesByPost, commentsByPost } = await fetchLikesAndComments([postId]);
  const authorIds = new Set<string>([row.author_id as string]);
  (commentsByPost.get(postId) ?? []).forEach((c) => authorIds.add(c.author_id));
  const profiles = await fetchProfilesByIds([...authorIds]);

  return assemblePosts([row as PostRow], profiles, likesByPost, commentsByPost, currentUserId)[0];
}

export async function fetchFeed(currentUserId: string): Promise<Post[]> {
  if (!supabase) {
    mockStore.ensureSeeded();
    return mockStore.posts;
  }

  // 팔로우한 사람 + 내 게시물만 피드에 노출합니다.
  const followingIds = await fetchFollowingIds(currentUserId);
  const visibleAuthorIds = [...new Set([...followingIds, currentUserId])];

  const { data: postRows, error } = await supabase
    .from('posts')
    .select('*')
    .in('author_id', visibleAuthorIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!postRows || postRows.length === 0) return [];

  const postIds = postRows.map((p) => p.id);
  const { likesByPost, commentsByPost } = await fetchLikesAndComments(postIds);

  const authorIds = new Set<string>(postRows.map((p) => p.author_id));
  commentsByPost.forEach((rows) => rows.forEach((c) => authorIds.add(c.author_id)));
  const profiles = await fetchProfilesByIds([...authorIds]);

  return assemblePosts(postRows as PostRow[], profiles, likesByPost, commentsByPost, currentUserId);
}

export interface CreatePostPayload {
  authorId: string;
  username: string;
  avatarColor: string;
  avatarUrl: string | null;
  image: string;
  strokes: Post['strokes'];
  drawing?: Post['drawing'];
  caption: string;
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백
    const post: Post = {
      id: 'p' + Date.now(),
      authorId: payload.authorId,
      username: payload.username,
      avatarColor: payload.avatarColor,
      avatarUrl: payload.avatarUrl,
      time: '방금 전',
      image: payload.image,
      strokes: payload.strokes,
      drawing: payload.drawing,
      caption: payload.caption,
      liked: false,
      likes: 0,
      comments: [],
      mine: true
    };
    return mockStore.addPost(post);
  }

  const imageUrl = await uploadPostImage(payload.authorId, payload.image);
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: payload.authorId,
      image_url: imageUrl,
      strokes: payload.strokes,
      drawing: payload.drawing ?? null,
      caption: payload.caption
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? '게시물을 올리지 못했어요');

  return {
    id: data.id,
    authorId: data.author_id,
    username: payload.username,
    avatarColor: payload.avatarColor,
    avatarUrl: payload.avatarUrl,
    time: formatPostTime(data.created_at),
    image: data.image_url,
    strokes: data.strokes ?? [],
    drawing: data.drawing ?? payload.drawing,
    caption: data.caption,
    liked: false,
    likes: 0,
    comments: [],
    mine: true
  };
}

export async function toggleLike(postId: string, currentUserId: string, currentlyLiked: boolean): Promise<Post | undefined> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백
    return mockStore.toggleLike(postId);
  }
  if (currentlyLiked) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId });
    if (error) throw new Error(error.message);
  }
  return fetchSinglePost(postId, currentUserId);
}

export async function addComment(postId: string, currentUserId: string, comment: Comment): Promise<Post | undefined> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백
    return mockStore.addComment(postId, comment);
  }
  const { error } = await supabase.from('post_comments').insert({ post_id: postId, author_id: currentUserId, text: comment.text });
  if (error) throw new Error(error.message);
  return fetchSinglePost(postId, currentUserId);
}

export async function deletePost(postId: string): Promise<void> {
  if (!supabase) {
    // TODO(backend): Supabase 미설정 상태의 목업 폴백
    mockStore.deletePost(postId);
    return;
  }
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw new Error(error.message);
}
