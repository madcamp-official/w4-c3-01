import { useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { useAppState } from '@/state/AppStateContext';
import type { Post } from '@/types';

const BURST_MARKS = ['✎', '✳', '✦'];

/** Shared like button (hand-drawn heart doodle + pop/burst animation) — used
 * by both the compact list card (PostCard) and the swipeable story card
 * (FeedPage), which needs `stopPropagation` so tapping it doesn't also
 * trigger the card's drag gesture. */
export default function LikeButton({ post, className }: { post: Post; className?: string }) {
  const { session, likePost } = useAppState();
  const [popping, setPopping] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);

  async function handleLike(e: MouseEvent) {
    e.stopPropagation();
    const willLike = !post.liked;
    await likePost(post.id);
    if (willLike) {
      setPopping(false);
      requestAnimationFrame(() => setPopping(true));
      const id = Date.now();
      setBursts((prev) => [...prev, id]);
      setTimeout(() => setBursts((prev) => prev.filter((b) => b !== id)), 650);
    }
  }

  function stopDrag(e: PointerEvent) {
    e.stopPropagation();
  }

  return (
    <button
      className={(className ? className + ' ' : '') + 'like-btn' + (post.liked ? ' liked' : '') + (popping ? ' pop' : '')}
      style={{ position: 'relative' }}
      onClick={handleLike}
      onPointerDown={stopDrag}
    >
      <img className="heart-icon heart-doodle" src={session?.heartUrl ?? ''} alt="좋아요" />
      {bursts.map((id, i) => (
        <span key={id} className="burst" style={{ '--bx': `${(i % 3) * 16 - 16}px` } as CSSProperties}>
          {BURST_MARKS[i % BURST_MARKS.length]}
        </span>
      ))}
    </button>
  );
}
