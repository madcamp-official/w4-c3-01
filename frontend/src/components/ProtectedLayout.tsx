import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppState } from '@/state/AppStateContext';

/** Guards the authenticated screens and bootstraps feed/chats/lounges once per session. */
export default function ProtectedLayout() {
  const { session, loadFeed, loadChats, loadLounges } = useAppState();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!session || bootstrapped.current) return;
    bootstrapped.current = true;
    void loadFeed();
    void loadChats();
    void loadLounges();
  }, [session, loadFeed, loadChats, loadLounges]);

  if (!session) return <Navigate to="/" replace />;
  return <Outlet />;
}
