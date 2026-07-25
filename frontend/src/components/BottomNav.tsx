import { useLocation, useNavigate } from 'react-router-dom';
import { useOverlay } from '@/state/OverlayContext';

const NAV_ITEMS = [
  {
    path: '/feed',
    nav: 'feed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    )
  },
  {
    path: '/lounges',
    nav: 'loungelist',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
        <circle cx={12} cy={10} r={2.7} />
        <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8Z" />
      </svg>
    )
  },
  {
    path: '/camera',
    nav: 'camera',
    plus: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    )
  },
  {
    path: '/search',
    nav: 'search',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
        <circle cx={11} cy={11} r={7} />
        <path d="m21 21-4.3-4.3" />
      </svg>
    )
  },
  {
    path: '/mypage',
    nav: 'mypage',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
        <circle cx={12} cy={8} r={4} />
        <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
      </svg>
    )
  }
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
                item.icon
              )}
            </button>
          );
        }
        if (item.plus) {
          return (
            <button key={item.nav} className="nav-plus sk" onClick={() => navigate(item.path)} aria-label="촬영">
              {item.icon}
            </button>
          );
        }
        return (
          <button
            key={item.nav}
            className={'nav-btn' + (active === item.nav ? ' active' : '')}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
          </button>
        );
      })}
    </nav>
  );
}
