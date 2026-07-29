import { useState, type MouseEvent, type PointerEvent } from 'react';
import { useAppState } from '@/state/AppStateContext';
import type { Post } from '@/types';

/** Shared like button (hand-drawn heart doodle + pop animation) — used by
 * both the compact list card (PostCard) and the swipeable story card
 * (FeedPage), which needs `stopPropagation` so tapping it doesn't also
 * trigger the card's drag gesture. */
export default function LikeButton({ post, className }: { post: Post; className?: string }) {
  const { session, likePost } = useAppState();
  const [popping, setPopping] = useState(false);

  async function handleLike(e: MouseEvent) {
    e.stopPropagation();
    const willLike = !post.liked;
    await likePost(post.id);
    if (willLike) {
      setPopping(false);
      requestAnimationFrame(() => setPopping(true));
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
    </button>
  );
}
