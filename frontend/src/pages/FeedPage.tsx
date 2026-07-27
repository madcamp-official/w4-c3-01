import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import PostCard from '@/components/PostCard';
import { useAppState } from '@/state/AppStateContext';

const SWIPE_THRESHOLD = 70;
const SWIPE_UP_THRESHOLD = 60;

/** Dual-mode home feed matching 4주차/week4/ALine Prototype.dc.html: "horizontal"
 * is one full-bleed post per page, dragged forward-only (once you've moved on
 * to the next post you can't drag back to a previous one — the prototype's
 * `if (dx > 0) dx = 0` clamp, kept as-is here); a clear upward swipe switches
 * to "vertical", a compact scrolling list. There's no way back to horizontal
 * mode from vertical — removed by request.
 * Manual pointer-drag (not CSS scroll-snap) because scroll-snap can't be
 * made one-directional and doesn't compose cleanly with a separate
 * vertical-swipe gesture on the same element. */
export default function FeedPage() {
  const navigate = useNavigate();
  const { posts, loadFeed } = useAppState();
  const [mode, setMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [idx, setIdx] = useState(0);
  const [dragDx, setDragDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'horizontal') setIdx(0);
  }, [mode]);

  function handlePointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    let dx = e.clientX - start.current.x;
    if (dx > 0) dx = 0; // forward-only — dragging "back" never moves the strip
    if (idx >= posts.length - 1) dx = 0;
    setDragDx(dx);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!start.current) return;
    const dx = dragDx;
    const dy = e.clientY - start.current.y;
    start.current = null;
    setDragging(false);
    if (Math.abs(dy) > Math.abs(dx) && dy < -SWIPE_UP_THRESHOLD) {
      setDragDx(0);
      setMode('vertical');
      return;
    }
    if (dx < -SWIPE_THRESHOLD && idx < posts.length - 1) {
      setIdx((i) => i + 1);
    }
    setDragDx(0);
  }

  return (
    <section className="screen active" id="screen-feed">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <div className="logo">
          <span className="dot" />
          ALine
        </div>
        <button className="icon-btn sk" onClick={() => navigate('/chats')}>
          <Icon name="send" size={20} />
        </button>
      </div>
      {mode === 'horizontal' ? (
        <>
          <div
            className="feed-strip"
            style={{
              transform: `translateX(calc(-${idx * 100}% + ${dragDx}px))`,
              transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(.2,.8,.3,1)'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {posts.map((post) => (
              <PostCard key={post.id} post={post} variant="horizontal" />
            ))}
          </div>
          <div className="feed-swipe-hint">
            <button onClick={() => setMode('vertical')} aria-label="세로 피드로 보기">
              <Icon name="chevron-left" size={18} className="" style={{ transform: 'rotate(90deg)' }} />
              위로 스와이프하면 피드 보기
            </button>
          </div>
        </>
      ) : (
        <div className="feed-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} variant="vertical" />
          ))}
        </div>
      )}
    </section>
  );
}
