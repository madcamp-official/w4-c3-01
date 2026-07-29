import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import LikeButton from '@/components/LikeButton';
import PostCard from '@/components/PostCard';
import TopBar from '@/components/TopBar';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';

const SWIPE_THRESHOLD = 70;
const EXIT_MS = 260;

/** Dual-mode home feed matching week4_1/ALine.dc.html: "card" mode shows one
 * floating story-style card (with the next post peeking out from behind),
 * dragged forward-only (dragging "back" past center is heavily damped —
 * matches the prototype's `if (dx > 0) dx *= 0.2`) with a fling-off exit
 * animation when released past threshold; a clear upward swipe switches to
 * "list", a compact scrolling list. There's no way back to card mode from
 * list — removed by request. */
export default function FeedPage() {
  const navigate = useNavigate();
  const { posts, loadFeed, loadChats, startConversationWith, sendText } = useAppState();
  const { openComments } = useOverlay();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'card' | 'list'>('card');
  const [idx, setIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  // Distinguishes a tap (navigate to the post) from a drag (swipe) — click
  // events still fire on pointerup after a drag, so onClick alone can't tell
  // them apart.
  const movedRef = useRef(false);

  useEffect(() => {
    void loadFeed();
    void loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'card') setIdx(0);
  }, [mode]);

  useEffect(() => {
    setMessageDraft('');
  }, [idx]);

  // After advancing to the next post, the reset-to-center transform lands in
  // the SAME render as the new post's content, but the transition below is
  // still enabled — without suppressing it for exactly one paint, the new
  // post would visibly slide in from the outgoing card's fly-off position
  // instead of just appearing already centered. Cleared on the next frame so
  // ordinary drag-release springs keep animating normally.
  useEffect(() => {
    if (!snapping) return;
    const raf = requestAnimationFrame(() => setSnapping(false));
    return () => cancelAnimationFrame(raf);
  }, [snapping]);

  const currentPost = posts[idx];
  const peekPost = idx + 1 < posts.length ? posts[idx + 1] : null;

  async function handleSendMessage() {
    const text = messageDraft.trim();
    if (!text || !currentPost || sendingMessage) return;
    setSendingMessage(true);
    try {
      const chatId = await startConversationWith(currentPost.authorId);
      if (!chatId) {
        showToast('채팅을 시작하지 못했어요');
        return;
      }
      await sendText(chatId, text);
      setMessageDraft('');
      showToast('메시지를 보냈어요');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '메시지를 보내지 못했어요');
    } finally {
      setSendingMessage(false);
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (exiting) return;
    start.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    let dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) movedRef.current = true;
    if (dx > 0) dx *= 0.2; // dragging "back" resists instead of hard-stopping
    setDragX(dx);
    setDragY(dy);
  }

  function handlePointerUp() {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (dragY < -SWIPE_THRESHOLD && Math.abs(dragY) > Math.abs(dragX)) {
      setDragX(0);
      setDragY(0);
      setMode('list');
      return;
    }
    if (dragX < -(SWIPE_THRESHOLD + 20) && idx < posts.length - 1) {
      setExiting(true);
      setTimeout(() => {
        setIdx((i) => Math.min(i + 1, posts.length - 1));
        setExiting(false);
        setDragX(0);
        setDragY(0);
        setSnapping(true);
      }, EXIT_MS);
      return;
    }
    setDragX(0);
    setDragY(0);
  }

  const rot = Math.max(-18, Math.min(6, dragX / 14));
  const cardStyle: CSSProperties = {
    transform: `translate(${exiting ? -560 : dragX}px, ${exiting ? 40 : dragY * 0.15}px) rotate(${exiting ? -16 : rot}deg)`,
    transition: dragging || snapping ? 'none' : 'transform 300ms cubic-bezier(.22,.9,.35,1), opacity 300ms',
    opacity: exiting ? 0 : 1
  };

  return (
    <section className="screen active" id="screen-feed">
      <TopBar />
      {mode === 'card' ? (
        <>
          {/* Pointer handlers live on this wrapper (dots + stage + hint), not
              just the card image, so an upward swipe started anywhere here —
              not only on top of the photo — reveals the list. It still only
              visually drags the card itself (cardStyle above), and doesn't
              wrap the DM input row below so typing there isn't affected. */}
          <div
            className="story-swipe-zone"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {posts.length ? (
              <div className="feed-dots">
                {posts.map((post, i) => (
                  <span key={post.id} className={i <= idx ? 'feed-dot active' : 'feed-dot'} />
                ))}
              </div>
            ) : null}
            <div className="story-stage">
              <div className="story-frame">
                {peekPost ? (
                  <div className="story-peek">
                    <img src={peekPost.image} alt="" />
                  </div>
                ) : null}
                {currentPost ? (
                  <div
                    className="story-card"
                    style={{ ...cardStyle, cursor: 'pointer' }}
                    onClick={() => {
                      if (movedRef.current || exiting) return;
                      navigate(`/posts/${currentPost.id}`);
                    }}
                  >
                    <img className="story-card-img" src={currentPost.image} alt="" />
                    <div
                      className="story-card-topbar"
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(currentPost.mine ? '/mypage' : `/users/${currentPost.authorId}`);
                      }}
                    >
                      <Avatar nickname={currentPost.username} color={currentPost.avatarColor} size={30} fontSize={12} avatarUrl={currentPost.avatarUrl} />
                      <span>
                        {currentPost.username} · {currentPost.time}
                      </span>
                    </div>
                    <div className="story-card-stats">
                      <span className="story-stat">
                        <LikeButton post={currentPost} className="story-like" />
                        {currentPost.likes}
                      </span>
                      <button
                        className="story-stat story-comment"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          openComments(currentPost.id);
                        }}
                      >
                        <Icon name="message-circle" size={16} className="" />
                        {currentPost.comments.length}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="feed-swipe-hint">
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setMode('list')} aria-label="세로 피드로 보기">
                <Icon name="chevron-left" size={18} className="" style={{ transform: 'rotate(90deg)' }} />
                위로 밀어 피드 보기 · 옆으로 밀어 다음 이야기
              </button>
            </div>
          </div>
          {currentPost ? (
            <div className="thread-input" style={{ padding: '8px 0 4px' }}>
              <input
                type="text"
                className="sk"
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`${currentPost.username}에게 메시지 보내기...`}
              />
              <button
                className="round-icon send sk"
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageDraft.trim()}
                aria-label="메시지 보내기"
              >
                <Icon name="send" size={17} />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="feed-list">
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} isLast={i === posts.length - 1} />
          ))}
        </div>
      )}
    </section>
  );
}
