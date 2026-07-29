// Ported from mobile/src/screens/SendToChatScreen.tsx — keep in sync.
import { useEffect, useState } from 'react';
import Avatar from '@/components/Avatar';
import * as followApi from '@/api/followApi';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';
import type { UserSummary } from '@/types';

export default function SendToChatSheet() {
  const { sendToChatPostId, closeSendToChat } = useOverlay();
  const { session, posts, startConversationWith, sendPost } = useAppState();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const open = Boolean(sendToChatPostId);
  const post = sendToChatPostId ? posts.find((p) => p.id === sendToChatPostId) : undefined;

  useEffect(() => {
    if (!open || !session) return;
    let cancelled = false;
    setUsers(null);
    followApi.fetchFollowing(session.id).then((result) => {
      if (!cancelled) setUsers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [open, session]);

  async function handleSelect(otherUserId: string) {
    if (!post || sendingTo) return;
    setSendingTo(otherUserId);
    try {
      const chatId = await startConversationWith(otherUserId);
      if (!chatId) {
        showToast('채팅을 시작하지 못했어요');
        return;
      }
      await sendPost(chatId, post);
      showToast('게시물을 보냈어요');
      closeSendToChat();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '게시물을 보내지 못했어요');
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <>
      <div className={'backdrop' + (open ? ' open' : '')} onClick={closeSendToChat} />
      <div className={'sheet' + (open ? ' open' : '')}>
        <div className="sheet-handle" />
        <div className="sheet-title">채팅으로 보내기</div>
        <div className="comment-list">
          {users === null ? null : users.length === 0 ? (
            <div className="empty-note">팔로우한 사람이 없어요. 먼저 누군가를 팔로우해보세요.</div>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                className="user-row"
                disabled={Boolean(sendingTo)}
                onClick={() => handleSelect(u.id)}
                style={{ opacity: sendingTo && sendingTo !== u.id ? 0.4 : 1 }}
              >
                <Avatar nickname={u.nickname} color={u.avatarColor} size={40} fontSize={14} avatarUrl={u.avatarUrl} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <b>{u.nickname}</b>
                  <span style={{ fontSize: 11.5 }}>@{u.username}</span>
                </div>
                {sendingTo === u.id ? <span style={{ marginLeft: 'auto', fontSize: 11.5 }}>전송 중...</span> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
