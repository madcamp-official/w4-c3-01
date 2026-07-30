// Ported to mobile/src/screens/NotificationsScreen.tsx — keep in sync.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, loadNotifications, markNotificationsRead } = useAppState();

  useEffect(() => {
    void loadNotifications();
    void markNotificationsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function messageFor(item: Notification): string {
    return item.type === 'like' ? `${item.actorName}님이 게시물을 좋아합니다` : `${item.actorName}님이 팔로우하기 시작했어요`;
  }

  function handleClick(item: Notification) {
    if (item.type === 'like') {
      if (item.postId) navigate(`/posts/${item.postId}`);
    } else {
      navigate(`/users/${item.actorId}`);
    }
  }

  return (
    <section className="screen active" id="screen-notifications">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px 10px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate('/feed')} aria-label="뒤로">
          <Icon name="chevron-left" size={20} strokeWidth={2.2} />
        </button>
        <div className="logo" style={{ fontSize: 20 }}>
          알림
        </div>
      </div>
      <div className="chat-list">
        {notifications.length === 0 ? (
          <div style={{ color: 'var(--ink-soft)', fontSize: 13, padding: '20px 6px' }}>아직 알림이 없어요</div>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className="chat-row" onClick={() => handleClick(item)}>
              <Avatar nickname={item.actorName} color={item.actorAvatarColor} size={44} fontSize={16} avatarUrl={item.actorAvatarUrl} />
              <div className="info">
                <b style={{ fontWeight: 500 }}>{messageFor(item)}</b>
                <span>{item.time}</span>
              </div>
              {!item.read ? <span className="unread-dot" style={{ position: 'static', flexShrink: 0 }} /> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
