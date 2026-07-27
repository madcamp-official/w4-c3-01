import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are configured. */
export const supabaseEnabled = Boolean(url && anonKey);

// PKCE flow는 로그인 후 리다이렉트에 토큰을 URL 해시(#)가 아니라 쿼리스트링(?code=)으로
// 붙여줍니다. 이 앱은 HashRouter라 라우팅도 #을 쓰기 때문에, 구현(implicit) 플로우를 쓰면
// Google 로그인 콜백이 라우터 경로와 충돌할 수 있어 명시적으로 pkce로 고정합니다.
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url, anonKey, { auth: { flowType: 'pkce' } })
  : null;
