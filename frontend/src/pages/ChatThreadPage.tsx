import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';

export default function ChatThreadPage() {
  const navigate = useNavigate();
  const { chatId = '' } = useParams();
  const { loadThread, sendText, getChat, subscribeToThread } = useAppState();
  const { openViewerForMessage } = useOverlay();
  const { showToast } = useToast();
  const [text, setText] = useState('');

  useEffect(() => {
    void loadThread(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    const unsubscribe = subscribeToThread(chatId);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const chat = getChat(chatId);

  async function handleSend() {
    if (!text.trim()) return;
    const value = text.trim();
    setText('');
    try {
      await sendText(chatId, value);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '메시지를 보내지 못했어요');
    }
  }

  if (!chat) {
    return (
      <section className="screen active" id="screen-chatthread">
        <div className="thread-header sk-hr-b">
          <button className="icon-btn sk" onClick={() => navigate('/chats')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen active" id="screen-chatthread">
      <div className="thread-header sk-hr-b">
        <button className="icon-btn sk" onClick={() => navigate('/chats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <Avatar nickname={chat.name} color={chat.color} size={30} fontSize={12} />
        <b>{chat.name}</b>
      </div>
      <div className="thread-body">
        {chat.messages.map((m) =>
          m.type === 'text' ? (
            <div className={'msg-row' + (m.from === 'me' ? ' me' : '')} key={m.id}>
              <div className="bubble sk">{m.text}</div>
            </div>
          ) : (
            <div className={'msg-row' + (m.from === 'me' ? ' me' : '')} key={m.id}>
              <div className="bubble air sk" onClick={() => openViewerForMessage(m)}>
                <img src={m.image} alt="손글씨 메시지" />
                <div className="air-tag">✏️ 손글씨 · 눌러서 다시보기</div>
              </div>
            </div>
          )
        )}
      </div>
      <div className="thread-input">
        <button className="round-icon sk" onClick={() => navigate(`/chats/${chatId}/airwrite`)} aria-label="에어라이팅 메시지">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <input
          type="text"
          className="sk"
          placeholder="메시지 보내기..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="round-icon send sk" onClick={handleSend} aria-label="전송">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m22 2-7 20-4-9-9-4Z" />
          </svg>
        </button>
      </div>
    </section>
  );
}
