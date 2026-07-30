import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import { usePlacement } from '@/state/PlacementContext';
import { useToast } from '@/state/ToastContext';
import type { PreviewNavState } from '@/types-nav';

export default function PreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sharePost, editPost } = useAppState();
  const { startPlacing } = usePlacement();
  const { showToast } = useToast();
  const navState = location.state as PreviewNavState | null;
  const [caption, setCaption] = useState(navState?.caption ?? '');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!navState) navigate('/camera', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!navState) return null;
  const { image, strokes, drawing, intent, editPostId } = navState;
  const isEditing = !!editPostId;

  async function handleShare() {
    if (isEditing) {
      setSharing(true);
      try {
        await editPost(editPostId, caption.trim());
        showToast('게시물을 수정했어요');
        navigate(-1);
      } catch (err) {
        showToast(err instanceof Error ? err.message : '게시물을 수정하지 못했어요');
      } finally {
        setSharing(false);
      }
      return;
    }
    if (intent.kind === 'lounge') {
      startPlacing(image, strokes);
      navigate(`/lounges/${intent.loungeId}`, { replace: true });
      return;
    }
    setSharing(true);
    try {
      await sharePost({ image, strokes, drawing, caption: caption.trim() });
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
        <button
          className="icon-btn prev-top sk"
          onClick={() => (isEditing ? navigate(-1) : navigate('/camera', { state: { intent } }))}
        >
          <Icon name="chevron-left" size={24} strokeWidth={2.3} className="" />
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
          {isEditing
            ? sharing
              ? '수정하는 중...'
              : '수정하기'
            : intent.kind === 'lounge'
              ? '이 자리에 배치하기'
              : sharing
                ? '공유하는 중...'
                : '공유하기'}
        </button>
      </div>
    </section>
  );
}
