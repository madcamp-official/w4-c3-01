import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';

function isSameDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateDivider(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(iso));
}

export default function ChatThreadPage() {
  const navigate = useNavigate();
  const { chatId = '' } = useParams();
  const { loadThread, sendText, getChat, subscribeToThread, markThreadRead } = useAppState();
  const { openViewerForMessage } = useOverlay();
  const { showToast } = useToast();
  const [text, setText] = useState('');

  const chat = getChat(chatId);

  useEffect(() => {
    void loadThread(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    const unsubscribe = subscribeToThread(chatId);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // 대화방을 보고 있는 동안(처음 열 때 + 새 메시지가 올 때) 읽음 시각을 갱신합니다.
  useEffect(() => {
    if (chat) void markThreadRead(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, chat?.messages.length]);

  const lastReadMineId = useMemo(() => {
    if (!chat?.otherReadAt) return null;
    const readAt = new Date(chat.otherReadAt).getTime();
    let result: number | null = null;
    chat.messages.forEach((m) => {
      if (m.from === 'me' && new Date(m.createdAt).getTime() <= readAt) result = m.id;
    });
    return result;
  }, [chat]);

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
        <Avatar nickname={chat.name} color={chat.color} size={30} fontSize={12} avatarUrl={chat.avatarUrl} />
        <b>{chat.name}</b>
      </div>
      <div className="thread-body">
        {chat.messages.map((m, i) => {
          const showDateDivider = i === 0 || !isSameDay(chat.messages[i - 1].createdAt, m.createdAt);
          return (
            <div key={m.id}>
              {showDateDivider ? (
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-soft)', margin: '10px 0 4px' }}>
                  {formatDateDivider(m.createdAt)}
                </div>
              ) : null}
              <div
                className={'msg-row' + (m.from === 'me' ? ' me' : '')}
                style={{ flexDirection: 'column', alignItems: m.from === 'me' ? 'flex-end' : 'flex-start', gap: 3 }}
              >
                {m.type === 'text' ? (
                  <div className="bubble sk">{m.text}</div>
                ) : (
                  <div className="bubble air sk" onClick={() => openViewerForMessage(m)}>
                    <img src={m.image} alt="손글씨 메시지" />
                    <div className="air-tag">✏️ 손글씨 · 눌러서 다시보기</div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {m.from === 'me' && m.id === lastReadMineId ? (
                    <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>읽음</span>
                  ) : null}
                  <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{m.time}</span>
                </div>
              </div>
            </div>
          );
        })}
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
