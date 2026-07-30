import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import LikeButton from '@/components/LikeButton';
import PostMenu from '@/components/PostMenu';
import { replayStrokes, setupHiDPI } from '@/lib/canvas';
import { useOverlay } from '@/state/OverlayContext';
import type { Post } from '@/types';

/** Compact list-mode card — see FeedPage.tsx for the swipeable story-card mode (a separate renderer). */
export default function PostCard({ post, isLast }: { post: Post; isLast?: boolean }) {
  const navigate = useNavigate();
  const { openComments, openShare } = useOverlay();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const openProfile = () => navigate(post.mine ? '/mypage' : `/users/${post.authorId}`);
  const openEdit = () =>
    navigate('/preview', {
      state: {
        image: post.image,
        strokes: post.strokes,
        drawing: post.drawing,
        intent: { kind: 'post' },
        editPostId: post.id,
        caption: post.caption
      }
    });

  useEffect(() => {
    if (!canvasRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (canvasRef.current) ctxRef.current = setupHiDPI(canvasRef.current);
    });
    return () => cancelAnimationFrame(raf);
  }, [post.id]);

  function handleReplay() {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current || !post.strokes.length) return;
    const rect = canvas.getBoundingClientRect();
    const img = imgRef.current;
    const sourceAspect = img?.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : rect.width / rect.height;
    replayStrokes(post.strokes, ctxRef.current, rect.width, rect.height, 5, 1400, sourceAspect);
  }

  return (
    <article className={'post post-vertical' + (isLast ? '' : ' sk-hr-b')}>
      <div className="post-head-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="post-head" style={{ background: 'none', border: 'none', flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer' }} onClick={openProfile}>
          <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} avatarUrl={post.avatarUrl} />
          <div className="who">
            <b>{post.username}</b>
            <small>{post.time}</small>
          </div>
        </button>
        <PostMenu post={post} onEdit={openEdit} />
      </div>
      <div className="post-media" onClick={handleReplay} style={{ cursor: post.strokes.length ? 'pointer' : 'default' }}>
        <img ref={imgRef} src={post.image} alt="" />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </div>
      <div className="post-actions">
        <LikeButton post={post} />
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
