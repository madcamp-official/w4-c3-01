import { useLocation, useNavigate } from 'react-router-dom';
import Icon, { type IconName } from '@/components/Icon';
import { useOverlay } from '@/state/OverlayContext';

const NAV_ITEMS: { path: string; nav: string; icon: IconName; plus?: boolean }[] = [
  { path: '/feed', nav: 'feed', icon: 'home' },
  { path: '/lounges', nav: 'loungelist', icon: 'map-pin' },
  { path: '/camera', nav: 'camera', icon: 'edit-2', plus: true },
  { path: '/search', nav: 'search', icon: 'search' },
  { path: '/mypage', nav: 'mypage', icon: 'heart' }
];

export default function BottomNav({ heartUrl }: { heartUrl: string | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { openLogout } = useOverlay();
  const active = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))?.nav;

  return (
    <nav className="bottom-nav sk-hr-t">
      {NAV_ITEMS.map((item) => {
        if (item.nav === 'mypage') {
          return (
            <button
              key={item.nav}
              className={'nav-btn' + (active === 'mypage' ? ' active' : '')}
              onClick={() => (active === 'mypage' ? openLogout() : navigate(item.path))}
            >
              {heartUrl ? (
                <img src={heartUrl} className="icon-sk" style={{ width: 21, height: 21, objectFit: 'contain' }} alt="" />
              ) : (
                <Icon name={item.icon} />
              )}
            </button>
          );
        }
        if (item.plus) {
          return (
            <button key={item.nav} className="nav-plus sk" onClick={() => navigate(item.path)} aria-label="촬영">
              <Icon name={item.icon} size={20} style={{ color: 'var(--paper)' }} />
            </button>
          );
        }
        return (
          <button
            key={item.nav}
            className={'nav-btn' + (active === item.nav ? ' active' : '')}
            onClick={() => navigate(item.path)}
          >
            <Icon name={item.icon} size={21} />
          </button>
        );
      })}
    </nav>
  );
}
