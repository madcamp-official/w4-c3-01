import { supabase } from '@/lib/supabaseClient';
import { AVATAR_TONES, defaultHeartUrl } from '@/mock/store';
import type { LoginPayload, Session, SignupPayload } from '@/types';

const MOCK_SESSION_ID = 'mock-user';

/** profiles row shape as selected from Supabase (snake_case columns). */
interface ProfileRow {
  username: string;
  nickname: string;
  avatar_color: string;
  heart_url: string | null;
}

function toSession(userId: string, profile: ProfileRow): Session {
  return {
    id: userId,
    isAuthenticated: true,
    username: profile.username,
    nickname: profile.nickname,
    avatarColor: profile.avatar_color,
    heartUrl: profile.heart_url
  };
}

async function fetchProfileSession(userId: string): Promise<Session> {
  const { data, error } = await supabase!.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new Error('프로필을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
  return toSession(userId, data as ProfileRow);
}

/** "아이디 또는 이메일" 로그인 지원: @ 가 있으면 이메일로 보고, 아니면 username -> email 룩업. */
async function resolveEmail(identifier: string): Promise<string> {
  if (identifier.includes('@')) return identifier;
  const { data, error } = await supabase!.rpc('email_for_username', { lookup_username: identifier });
  if (error || !data) throw new Error('아이디를 찾을 수 없어요');
  return data as string;
}

export async function login(payload: LoginPayload): Promise<Session> {
  if (!supabase) {
    // Supabase 미설정: 목업 세션으로 동작 (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 채우면 실제 인증으로 전환됩니다)
    return {
      id: MOCK_SESSION_ID,
      isAuthenticated: true,
      username: payload.identifier,
      nickname: payload.identifier,
      avatarColor: AVATAR_TONES[0],
      heartUrl: defaultHeartUrl()
    };
  }

  const email = await resolveEmail(payload.identifier.trim());
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: payload.password });
  if (error || !data.user) throw new Error(error?.message ?? '아이디 또는 비밀번호를 확인해주세요');
  return fetchProfileSession(data.user.id);
}

export async function signup(payload: SignupPayload): Promise<Session> {
  if (!supabase) {
    // Supabase 미설정: 목업 세션으로 동작
    return {
      id: MOCK_SESSION_ID,
      isAuthenticated: true,
      username: payload.username,
      nickname: payload.nickname,
      avatarColor: AVATAR_TONES[0],
      heartUrl: payload.heartUrl
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        username: payload.username,
        nickname: payload.nickname,
        avatar_color: AVATAR_TONES[0],
        heart_url: payload.heartUrl
      }
    }
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('회원가입에 실패했어요. 잠시 후 다시 시도해주세요.');

  if (!data.session) {
    // Supabase 프로젝트에서 "Confirm email"이 켜져 있으면 로그인 세션 없이 유저만 생성됩니다.
    throw new Error('가입 확인 이메일을 보냈어요. 메일함을 확인한 뒤 로그인해주세요.');
  }

  return {
    id: data.user.id,
    isAuthenticated: true,
    username: payload.username,
    nickname: payload.nickname,
    avatarColor: AVATAR_TONES[0],
    heartUrl: payload.heartUrl
  };
}

export async function logout(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** 새로고침 후에도 로그인 상태를 유지하기 위해 앱 시작 시 한 번 호출합니다. */
export async function restoreSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  try {
    return await fetchProfileSession(user.id);
  } catch {
    return null;
  }
}
