import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
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
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const chat = getChat(chatId);

  // Instantly shows the latest message (no smooth-scroll animation) whenever
  // the thread first loads or grows — matches the mobile app's behavior.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat?.messages.length]);

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
            <Icon name="chevron-left" size={24} strokeWidth={2.3} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen active" id="screen-chatthread">
      <div className="thread-header sk-hr-b">
        <button className="icon-btn sk" onClick={() => navigate('/chats')}>
          <Icon name="chevron-left" size={24} strokeWidth={2.3} />
        </button>
        <Avatar nickname={chat.name} color={chat.color} size={30} fontSize={12} avatarUrl={chat.avatarUrl} />
        <b>{chat.name}</b>
      </div>
      <div className="thread-body" ref={bodyRef}>
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
                  <img className="air-message-image" src={m.image} alt="손글씨 메시지" onClick={() => openViewerForMessage(m)} />
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
        <button className="icon-bare" onClick={() => navigate(`/chats/${chatId}/airwrite`)} aria-label="에어라이팅 메시지">
          <Icon name="edit-2" size={18} />
        </button>
        <input
          type="text"
          className="sk"
          placeholder="메시지 보내기..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="icon-bare" onClick={handleSend} aria-label="전송">
          <Icon name="send" size={20} />
        </button>
      </div>
    </section>
  );
}
