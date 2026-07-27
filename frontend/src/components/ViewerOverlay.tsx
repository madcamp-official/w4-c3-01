import { useEffect, useRef } from 'react';
import { replayStrokes, setupHiDPI } from '@/lib/canvas';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';

export default function ViewerOverlay() {
  const { viewer, closeViewer } = useOverlay();
  const { posts, deletePost } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!viewer || !canvasRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (canvasRef.current) ctxRef.current = setupHiDPI(canvasRef.current);
    });
    return () => cancelAnimationFrame(raf);
  }, [viewer]);

  if (!viewer) return null;

  const post = viewer.postId ? posts.find((p) => p.id === viewer.postId) : undefined;

  function handleReplay() {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current || !viewer?.strokes) return;
    const rect = canvas.getBoundingClientRect();
    replayStrokes(viewer.strokes, ctxRef.current, rect.width, rect.height, 5, 1400);
  }

  async function handleDelete() {
    if (!post) return;
    if (!window.confirm('이 게시물을 삭제할까요?')) return;
    await deletePost(post.id);
    closeViewer();
  }

  return (
    <div className="overlay open">
      <div className="viewer-top">
        <button className="icon-btn sk" onClick={closeViewer} aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="viewer-media sk2">
        <img src={viewer.image} alt="" />
        <canvas ref={canvasRef} />
      </div>
      <div className="viewer-bottom">
        <div className="viewer-caption">{viewer.caption}</div>
        {viewer.strokes ? (
          <button className="btn primary sk" onClick={handleReplay}>
            ✏️ 다시 쓰는 순간 보기
          </button>
        ) : null}
        {post?.mine ? (
          <button className="btn ghost sk" style={{ color: 'var(--danger)' }} onClick={handleDelete}>
            삭제하기
          </button>
        ) : null}
      </div>
    </div>
  );
}
