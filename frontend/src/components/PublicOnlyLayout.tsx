import { Navigate, Outlet } from 'react-router-dom';
import { useAppState } from '@/state/AppStateContext';

/** Landing/login/signup screens: bounce straight to the feed if a session already exists (e.g. after a refresh). */
export default function PublicOnlyLayout() {
  const { session, sessionLoading } = useAppState();

  if (sessionLoading) return null;
  if (session) return <Navigate to="/feed" replace />;
  return <Outlet />;
}
