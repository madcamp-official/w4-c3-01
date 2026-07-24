import { apiRequest } from '@/api/client';
import { AVATAR_TONES, defaultHeartUrl } from '@/mock/store';
import type { LoginPayload, Session, SignupPayload } from '@/types';

export async function login(payload: LoginPayload): Promise<Session> {
  try {
    return await apiRequest<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch {
    // TODO(backend): replace with real session issued by POST /auth/login
    return {
      isAuthenticated: true,
      username: payload.username,
      nickname: payload.username,
      avatarColor: AVATAR_TONES[0],
      heartUrl: defaultHeartUrl(),
      followers: 128,
      following: 96
    };
  }
}

export async function signup(payload: SignupPayload): Promise<Session> {
  try {
    return await apiRequest<Session>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch {
    // TODO(backend): replace with real session issued by POST /auth/signup
    return {
      isAuthenticated: true,
      username: payload.username,
      nickname: payload.nickname,
      avatarColor: AVATAR_TONES[0],
      heartUrl: payload.heartUrl,
      followers: 0,
      following: 0
    };
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>('/auth/logout', { method: 'POST' });
  } catch {
    // TODO(backend): call POST /auth/logout once sessions are server-tracked
  }
}
