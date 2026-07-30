// Shared "ALine" wordmark + theme toggle + chat icon header, used by both
// the feed and my-page so the same top region shows up consistently
// everywhere. Ported to mobile/src/components/TopBar.tsx — keep in sync.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';

export default function TopBar() {
  const navigate = useNavigate();
  const { chats, notifications } = useAppState();
  const hasUnreadChats = useMemo(() => chats.some((c) => c.unread), [chats]);
  const hasUnreadNotifications = useMemo(() => notifications.some((n) => !n.read), [notifications]);
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
      <div className="logo">
        <span className="dot" />
        ALine
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="icon-btn" onClick={toggleTheme} aria-label="테마 전환">
          <Icon name={isDark ? 'sun' : 'moon'} size={19} className="" />
        </button>
        <button className="icon-btn sk" onClick={() => navigate('/notifications')}>
          <Icon name="bell" size={20} />
          {hasUnreadNotifications ? <span className="unread-dot" /> : null}
        </button>
        <button className="icon-btn sk" onClick={() => navigate('/chats')}>
          <Icon name="send" size={20} />
          {hasUnreadChats ? <span className="unread-dot" /> : null}
        </button>
      </div>
    </div>
  );
}
