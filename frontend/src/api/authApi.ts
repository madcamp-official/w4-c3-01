import { isUsernameAvailable } from '@/api/userApi';
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
  avatar_url: string | null;
  onboarded: boolean;
}

function toSession(userId: string, profile: ProfileRow): Session {
  return {
    id: userId,
    isAuthenticated: true,
    username: profile.username,
    nickname: profile.nickname,
    avatarColor: profile.avatar_color,
    heartUrl: profile.heart_url,
    avatarUrl: profile.avatar_url,
    onboarded: profile.onboarded
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
      heartUrl: defaultHeartUrl(),
      avatarUrl: null,
      onboarded: true
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
      heartUrl: payload.heartUrl,
      avatarUrl: payload.avatarUrl,
      onboarded: true
    };
  }

  // 회원가입 1단계에서 이미 확인했겠지만, 그사이(하트 그리기 등) 시간이 지났을 수 있어 한 번 더 확인합니다.
  if (!(await isUsernameAvailable(payload.username))) {
    throw new Error('이미 사용 중인 아이디예요');
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        username: payload.username,
        nickname: payload.nickname,
        avatar_color: AVATAR_TONES[0]
      }
    }
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('회원가입에 실패했어요. 잠시 후 다시 시도해주세요.');

  if (!data.session) {
    // Supabase 프로젝트에서 "Confirm email"이 켜져 있으면 로그인 세션 없이 유저만 생성됩니다.
    throw new Error('가입 확인 이메일을 보냈어요. 메일함을 확인한 뒤 로그인해주세요.');
  }

  // 하트/프로필 사진은 base64 이미지라 auth metadata(raw_user_meta_data)에 넣으면 안 됩니다 —
  // 거기 들어간 값은 이후 발급되는 모든 JWT(Authorization 헤더)에 그대로 실려서, Storage 업로드 같은
  // 일부 요청이 헤더 크기 제한에 걸려 알 수 없는 400으로 깨지는 원인이 됩니다. 그래서 로그인 세션이
  // 생긴 뒤 profiles 테이블에 별도로 저장합니다.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ heart_url: payload.heartUrl, avatar_url: payload.avatarUrl })
    .eq('id', data.user.id);
  if (profileError) throw new Error(profileError.message);

  return {
    id: data.user.id,
    isAuthenticated: true,
    username: payload.username,
    nickname: payload.nickname,
    avatarColor: AVATAR_TONES[0],
    heartUrl: payload.heartUrl,
    avatarUrl: payload.avatarUrl,
    onboarded: true
  };
}

/** Google 로그인/가입: 구글 화면으로 이동했다가 다시 이 앱으로 돌아옵니다. */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) throw new Error(error.message);
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
