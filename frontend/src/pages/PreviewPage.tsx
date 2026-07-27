import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '@/state/AppStateContext';
import { usePlacement } from '@/state/PlacementContext';
import { useToast } from '@/state/ToastContext';
import type { PreviewNavState } from '@/types-nav';

export default function PreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sharePost } = useAppState();
  const { startPlacing } = usePlacement();
  const { showToast } = useToast();
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const navState = location.state as PreviewNavState | null;

  useEffect(() => {
    if (!navState) navigate('/camera', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!navState) return null;
  const { image, strokes, intent } = navState;

  async function handleShare() {
    if (intent.kind === 'lounge') {
      startPlacing(image, strokes);
      navigate(`/lounges/${intent.loungeId}`, { replace: true });
      return;
    }
    setSharing(true);
    try {
      await sharePost({ image, strokes, caption: caption.trim() });
      navigate('/feed', { replace: true });
      showToast('게시물을 공유했어요 🎉');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '게시물을 공유하지 못했어요');
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="screen active" id="screen-preview">
      <div className="prev-media sk2">
        <img src={image} alt="촬영한 손글씨" />
        <button className="icon-btn prev-top sk" onClick={() => navigate('/camera', { state: { intent } })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>
      <div className="prev-bottom">
        {intent.kind === 'post' ? (
          <input
            type="text"
            className="sk"
            placeholder="문구를 남겨보세요..."
            maxLength={80}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        ) : null}
        <button className="btn primary sk block" disabled={sharing} onClick={handleShare}>
          {intent.kind === 'lounge' ? '이 자리에 배치하기' : sharing ? '공유하는 중...' : '공유하기'}
        </button>
      </div>
    </section>
  );
}
