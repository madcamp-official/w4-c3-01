import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppState } from '@/state/AppStateContext';

/** Guards the authenticated screens and bootstraps feed/chats/lounges once per session. */
export default function ProtectedLayout() {
  const { session, sessionLoading, loadFeed, loadChats, loadLounges } = useAppState();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!session || bootstrapped.current) return;
    bootstrapped.current = true;
    void loadFeed();
    void loadChats();
    void loadLounges();
  }, [session, loadFeed, loadChats, loadLounges]);

  // 새로고침 직후에는 Supabase 세션 복구가 끝날 때까지 랜딩으로 튕기지 않고 대기합니다.
  if (sessionLoading) return null;
  if (!session) return <Navigate to="/" replace />;
  return <Outlet />;
}
