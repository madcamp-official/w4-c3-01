import { useState, type CSSProperties } from 'react';
import Avatar from '@/components/Avatar';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import type { Post } from '@/types';

const BURST_MARKS = ['✎', '✳', '✦'];

export default function PostCard({ post }: { post: Post }) {
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
    <article className="post sk-hr-b">
      <div className="post-head">
        <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} />
        <div className="who">
          <b>
            {post.username}
            {post.mine ? <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}> (나)</span> : null}
          </b>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
            <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.7 8.7 0 0 1-4-1L3 20l1.2-4.3A8.4 8.4 0 1 1 21 11.5Z" />
          </svg>
        </button>
        <button className="action-btn" onClick={() => openShare(post.id)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
            <path d="m22 2-7 20-4-9-9-4Z" />
          </svg>
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
