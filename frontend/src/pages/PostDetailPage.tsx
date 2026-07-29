// Ported from mobile/src/screens/PostDetailScreen.tsx — keep in sync. The
// single-post "permalink" page — reached from the feed, profile/search
// grids, and shared-post chat messages. Replaces what those places used to
// do with ViewerOverlay (a bare image modal); this instead looks like an
// isolated PostCard (author, actions, caption) plus ViewerOverlay's old
// replay/delete behavior, now living here since only a real post needs them.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import LikeButton from '@/components/LikeButton';
import { replayStrokes, setupHiDPI } from '@/lib/canvas';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';

export default function PostDetailPage() {
  const navigate = useNavigate();
  const { postId = '' } = useParams();
  const { posts, loadPost, deletePost } = useAppState();
  const { openComments, openShare } = useOverlay();
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const post = posts.find((p) => p.id === postId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPost(postId).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (canvasRef.current) ctxRef.current = setupHiDPI(canvasRef.current);
    });
    return () => cancelAnimationFrame(raf);
  }, [post]);

  function handleReplay() {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current || !post?.strokes.length) return;
    const rect = canvas.getBoundingClientRect();
    const img = imgRef.current;
    const sourceAspect = img?.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : rect.width / rect.height;
    replayStrokes(post.strokes, ctxRef.current, rect.width, rect.height, 5, 1400, sourceAspect);
  }

  async function handleDelete() {
    if (!post) return;
    if (!window.confirm('이 게시물을 삭제할까요?')) return;
    await deletePost(post.id);
    navigate(-1);
  }

  return (
    <section className="screen active" id="screen-postdetail">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate(-1)}>
          <Icon name="chevron-left" size={24} strokeWidth={2.3} />
        </button>
        <div style={{ width: 36 }} />
      </div>
      {!post ? (
        <div className="empty-note">{loading ? '불러오는 중...' : '게시물을 찾을 수 없어요'}</div>
      ) : (
        <article className="post">
          <button
            className="post-head"
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => navigate(post.mine ? '/mypage' : `/users/${post.authorId}`)}
          >
            <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} avatarUrl={post.avatarUrl} />
            <div className="who">
              <b>{post.username}</b>
              <small>{post.time}</small>
            </div>
          </button>
          <div className="post-media">
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
            {post.strokes.length ? (
              <button className="btn primary sk" style={{ marginTop: 10 }} onClick={handleReplay}>
                다시 쓰는 순간 보기
              </button>
            ) : null}
            {post.mine ? (
              <button className="btn ghost sk" style={{ marginTop: 8, color: 'var(--danger)' }} onClick={handleDelete}>
                삭제하기
              </button>
            ) : null}
          </div>
        </article>
      )}
    </section>
  );
}
