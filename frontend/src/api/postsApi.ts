import { apiRequest } from '@/api/client';
import { mockStore } from '@/mock/store';
import type { Comment, Post } from '@/types';

export async function fetchFeed(): Promise<Post[]> {
  try {
    return await apiRequest<Post[]>('/posts');
  } catch {
    // TODO(backend): replace with GET /posts
    mockStore.ensureSeeded();
    return mockStore.posts;
  }
}

export interface CreatePostPayload {
  username: string;
  avatarColor: string;
  image: string;
  strokes: Post['strokes'];
  drawing?: Post['drawing'];
  caption: string;
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  try {
    return await apiRequest<Post>('/posts', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    // TODO(backend): replace with POST /posts
    const post: Post = {
      id: 'p' + Date.now(),
      username: payload.username,
      avatarColor: payload.avatarColor,
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
}

export async function toggleLike(postId: string): Promise<Post | undefined> {
  try {
    return await apiRequest<Post>(`/posts/${postId}/like`, { method: 'POST' });
  } catch {
    // TODO(backend): replace with POST /posts/:id/like
    return mockStore.toggleLike(postId);
  }
}

export async function addComment(postId: string, comment: Comment): Promise<Post | undefined> {
  try {
    return await apiRequest<Post>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment)
    });
  } catch {
    // TODO(backend): replace with POST /posts/:id/comments
    return mockStore.addComment(postId, comment);
  }
}

export async function deletePost(postId: string): Promise<void> {
  try {
    await apiRequest<void>(`/posts/${postId}`, { method: 'DELETE' });
  } catch {
    // TODO(backend): replace with DELETE /posts/:id
    mockStore.deletePost(postId);
  }
}
