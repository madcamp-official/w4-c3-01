import { useState, type CSSProperties } from 'react';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import type { Post } from '@/types';

const BURST_MARKS = ['✎', '✳', '✦'];

/** `variant="horizontal"` is a full-bleed page for the paged feed mode; `"vertical"` is the compact scrolling-list card. See FeedPage.tsx. */
export default function PostCard({ post, variant = 'vertical' }: { post: Post; variant?: 'horizontal' | 'vertical' }) {
  const { session, likePost } = useAppState();
  const { openViewer, openComments, openShare } = useOverlay();
  const [popping, setPopping] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);

  async function handleLike() {
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

  return (
    <article className={variant === 'horizontal' ? 'feed-page' : 'post post-vertical sk-hr-b'}>
      <div className="post-head">
        <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} avatarUrl={post.avatarUrl} />
        <div className="who">
          <b>{post.username}</b>
          <small>{post.time}</small>
        </div>
      </div>
      <div
        className="post-media"
        onClick={() => openViewer({ image: post.image, caption: post.caption, strokes: post.strokes, postId: post.id })}
      >
        <img src={post.image} alt="" />
      </div>
      <div className="post-actions">
        <button
          className={'like-btn' + (post.liked ? ' liked' : '') + (popping ? ' pop' : '')}
          style={{ position: 'relative' }}
          onClick={handleLike}
        >
          <img className="heart-icon" src={session?.heartUrl ?? ''} alt="좋아요" />
          {bursts.map((id, i) => (
            <span
              key={id}
              className="burst"
              style={{ '--bx': `${(i % 3) * 16 - 16}px` } as CSSProperties}
            >
              {BURST_MARKS[i % BURST_MARKS.length]}
            </span>
          ))}
        </button>
        <button className="action-btn" onClick={() => openComments(post.id)}>
          <Icon name="message-circle" />
        </button>
        <button className="action-btn" onClick={() => openShare(post.id)}>
          <Icon name="send" />
        </button>
      </div>
      <div className="post-meta">
        <div className="likes">좋아요 {post.likes}개</div>
        <div className="caption">
          <span>{post.username}</span>
          {post.caption}
        </div>
        {post.comments.length ? (
          <div className="time" style={{ marginBottom: 2, cursor: 'pointer' }} onClick={() => openComments(post.id)}>
            댓글 {post.comments.length}개 모두 보기
          </div>
        ) : null}
        <div className="time">{post.time}</div>
      </div>
    </article>
  );
}
