// Now shares the same real-camera + hand-tracking capture flow as the post
// camera (CameraPage.tsx) instead of the old finger-trail canvas, and the
// preview step reuses PreviewPage.tsx's exact layout (full-bleed image card,
// back-chevron overlay, single bottom button) — kept in sync with
// mobile/src/screens/AirwriteScreen.tsx, which already worked this way.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/Icon';
import { AirDrawingStage, type AirDrawingCapture } from '@/features/air-drawing/AirDrawingStage';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

export default function AirwritePage() {
  const navigate = useNavigate();
  const { chatId = '' } = useParams();
  const { sendAir } = useAppState();
  const { showToast } = useToast();
  const [preview, setPreview] = useState<AirDrawingCapture | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!preview) return;
    setSending(true);
    try {
      await sendAir(chatId, preview.image, preview.strokes);
      showToast('손글씨 메시지를 보냈어요');
      navigate(`/chats/${chatId}`, { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '메시지를 보내지 못했어요');
      setSending(false);
    }
  }

  if (preview) {
    return (
      <section className="screen active" id="screen-airwrite-preview">
        <div className="prev-media sk2">
          <img src={preview.image} alt="허공에 쓴 손글씨" />
          <button className="icon-btn prev-top sk" onClick={() => setPreview(null)}>
            <Icon name="chevron-left" size={24} strokeWidth={2.3} className="" />
          </button>
        </div>
        <div className="prev-bottom">
          <button className="btn primary sk block" disabled={sending} onClick={handleSend}>
            {sending ? '보내는 중...' : '이 메시지 보내기'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen active" id="screen-airwrite">
      <AirDrawingStage
        mode="message"
        // 260px는 채팅 말풍선(160px)엔 충분하지만 상세 뷰어(화면 너비, 고DPR
        // 기기에선 900px+)에선 크게 확대돼 흐릿해 보였다 — 게시물 캡처만큼
        // 여유 있게 키워 업스케일 흐림을 없앤다.
        outputSize={960}
        onClose={() => navigate(`/chats/${chatId}`)}
        onCapture={(capture) => setPreview(capture)}
        onError={showToast}
      />
    </section>
  );
}
