import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WeightPicker from '@/components/WeightPicker';
import { drawStrokesStatic } from '@/lib/canvas';
import { useTrailCanvas } from '@/hooks/useTrailCanvas';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

export default function AirwritePage() {
  const navigate = useNavigate();
  const { chatId = '' } = useParams();
  const { sendAir } = useAppState();
  const { showToast } = useToast();
  const trail = useTrailCanvas();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    trail.resize();
    trail.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    const strokes = trail.getStrokes();
    if (!strokes.length) {
      showToast('먼저 허공에 무언가를 그려주세요');
      return;
    }
    const out = document.createElement('canvas');
    out.width = 260;
    out.height = 260;
    const octx = out.getContext('2d')!;
    octx.fillStyle = '#F2ECDA';
    octx.fillRect(0, 0, 260, 260);
    drawStrokesStatic(octx, strokes, 260, 260, 6);
    setSending(true);
    try {
      await sendAir(chatId, out.toDataURL('image/png'), strokes);
      showToast('손글씨 메시지를 보냈어요');
      navigate(`/chats/${chatId}`, { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '메시지를 보내지 못했어요');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="screen active" id="screen-airwrite">
      <div className="cam-frame sk2" style={{ margin: '0 14px' }}>
        <canvas className="trail-canvas" ref={trail.canvasRef} style={{ background: 'var(--paper-2)' }} />
        <div className="cam-topbar">
          <button className="icon-btn sk" onClick={() => navigate(`/chats/${chatId}`)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <WeightPicker onChange={trail.setWeight} />
        </div>
        <div className="cam-hint sk">허공에 쓰듯 손가락으로 그어보세요</div>
        <div className="cam-botbar">
          <button className="side-btn sk" onClick={() => trail.clear()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
          <button className="btn primary sk" style={{ padding: '14px 30px' }} disabled={sending} onClick={handleSend}>
            {sending ? '보내는 중...' : '보내기'}
          </button>
          <div style={{ width: 40 }} />
        </div>
      </div>
    </section>
  );
}
