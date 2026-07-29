import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';

export default function ChatListPage() {
  const navigate = useNavigate();
  const { chats, loadChats } = useAppState();

  useEffect(() => {
    void loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="screen active" id="screen-chatlist">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px 10px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate('/feed')} aria-label="뒤로">
          <Icon name="chevron-left" size={20} strokeWidth={2.2} />
        </button>
        <div className="logo" style={{ fontSize: 20 }}>
          채팅
        </div>
      </div>
      <div className="chat-list">
        {chats.map((chat) => {
          const lastMsg = chat.messages[chat.messages.length - 1];
          const preview = !lastMsg ? '대화를 시작해보세요' : lastMsg.type === 'text' ? lastMsg.text : '✏️ 손글씨 메시지';
          return (
            <div key={chat.id} className="chat-row" onClick={() => navigate(`/chats/${chat.id}`)}>
              <Avatar nickname={chat.name} color={chat.color} size={44} fontSize={16} avatarUrl={chat.avatarUrl} />
              <div className="info">
                <b>{chat.name}</b>
                <span>{preview}</span>
              </div>
              <div className="time">{lastMsg?.time}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
