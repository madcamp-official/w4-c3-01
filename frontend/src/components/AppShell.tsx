import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import CommentSheet from '@/components/CommentSheet';
import LogoutSheet from '@/components/LogoutSheet';
import ShareSheet from '@/components/ShareSheet';
import SketchyDefs from '@/components/SketchyDefs';
import Toast from '@/components/Toast';
import ViewerOverlay from '@/components/ViewerOverlay';
import { useAppState } from '@/state/AppStateContext';

const NAV_PATHS = ['/feed', '/search', '/chats', '/mypage', '/lounges'];

export default function AppShell() {
  const location = useLocation();
  const { session } = useAppState();
  const showNav = NAV_PATHS.includes(location.pathname);

  return (
    <div className="book" id="book">
      <SketchyDefs />
      <Outlet />
      {showNav ? <BottomNav heartUrl={session?.heartUrl ?? null} /> : null}
      <ViewerOverlay />
      <CommentSheet />
      <ShareSheet />
      <LogoutSheet />
      <Toast />
    </div>
  );
}
