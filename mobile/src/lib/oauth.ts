// Replaces the web-only window.location redirect flow in
// frontend/src/api/authApi.ts's signInWithGoogle with a deep-link based flow
// (D1/Phase1 in the plan). Requires the app's redirect URL (currently the
// Expo Go dev URL, e.g. exp://<lan-ip>:<port>/--/auth-callback; the stable
// sonkkeut://auth-callback scheme once Phase 4 moves off Expo Go) to be
// registered in the Supabase project's Authentication > URL Configuration.
//
// NOTE: on this project, Supabase's Redirect URLs allow-list didn't seem to
// match custom-scheme (exp://) redirect URLs even when registered exactly —
// it kept falling back to Site URL. Site URL was pointed at the dev exp://
// URL as a workaround. Re-check this once Phase 4 switches to the stable
// sonkkeut:// scheme; the standard http(s) URLs (e.g. the web app's) matched
// the allow-list fine, so this looks specific to non-http(s) schemes.
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabaseClient';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요');

  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true }
  });
  if (error || !data?.url) throw new Error(error?.message ?? 'Google 로그인을 시작하지 못했어요');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google 로그인이 취소됐어요');
  }

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('Google 로그인 응답에서 인증 코드를 찾지 못했어요');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new Error(exchangeError.message);
}
