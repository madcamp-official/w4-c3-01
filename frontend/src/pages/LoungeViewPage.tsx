import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCamera } from '@/hooks/useCamera';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { usePlacement } from '@/state/PlacementContext';

export default function LoungeViewPage() {
  const navigate = useNavigate();
  const { loungeId = '' } = useParams();
  const { lounges, loadLounges, getLounge, placeInLounge, session } = useAppState();
  const { openViewerForMessage } = useOverlay();
  const { draft, updateDraft, clearDraft } = usePlacement();
  const { videoRef, cameraAvailable } = useCamera('environment');

  useEffect(() => {
    if (lounges.length === 0) void loadLounges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lounge = getLounge(loungeId);
  const itemCount = lounge?.items.length ?? 0;

  function handleStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!draft) return;
    const target = e.target as HTMLElement;
    if (target.closest('.place-controls') || target.closest('.cam-topbar')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    updateDraft({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }

  async function handleConfirm() {
    if (!draft || !session) return;
    await placeInLounge(loungeId, { ...draft, author: session.nickname });
    clearDraft();
  }

  if (!lounge) return null;

  return (
    <section className="screen active" id="screen-loungeview">
      <div className="cam-frame sk2" style={{ margin: '0 14px' }} onClick={handleStageClick}>
        <video ref={videoRef} autoPlay playsInline muted style={{ display: cameraAvailable ? 'block' : 'none' }} />
        {!cameraAvailable ? <div className="cam-fallback" /> : null}
        <div style={{ position: 'absolute', inset: 0 }}>
          {lounge.items.map((it, idx) => {
            const size = 70 * it.scale;
            return (
              <div
                key={idx}
                className="sticker"
                style={{
                  left: `${it.x * 100}%`,
                  top: `${it.y * 100}%`,
                  width: size,
                  height: size,
                  transform: `translate(-50%,-50%) rotate(${it.rotation}deg)`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  openViewerForMessage({ image: it.image, strokes: it.strokes });
                }}
              >
                <img src={it.image} alt="" />
              </div>
            );
          })}
          {draft ? (
            <div
              className="sticker ghost"
              style={{
                left: `${draft.x * 100}%`,
                top: `${draft.y * 100}%`,
                width: 90 * draft.scale,
                height: 90 * draft.scale,
                transform: `translate(-50%,-50%) rotate(${draft.rotation}deg)`
              }}
            >
              <img src={draft.image} alt="" />
            </div>
          ) : null}
        </div>
        <div className="cam-topbar">
          <button className="icon-btn sk" onClick={() => navigate('/lounges')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <b style={{ background: 'var(--paper)', padding: '6px 12px', borderRadius: 999, fontSize: 12 }}>{lounge.name}</b>
        </div>
        <div className="place-hint">{draft ? '원하는 자리를 눌러 배치하세요' : `이 장소에 남겨진 손글씨 ${itemCount}개`}</div>

        {draft ? (
          <div className="place-controls open">
            <div className="row">
              크기{' '}
              <input
                type="range"
                min={0.4}
                max={2}
                step={0.05}
                value={draft.scale}
                onChange={(e) => updateDraft({ scale: Number(e.target.value) })}
              />
            </div>
            <div className="row">
              방향{' '}
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={draft.rotation}
                onChange={(e) => updateDraft({ rotation: Number(e.target.value) })}
              />
            </div>
            <div className="btn-row">
              <button className="btn ghost sk" style={{ flex: 1 }} onClick={() => clearDraft()}>
                취소
              </button>
              <button className="btn primary sk" style={{ flex: 1 }} onClick={handleConfirm}>
                이 자리에 저장
              </button>
            </div>
          </div>
        ) : (
          <div className="cam-botbar">
            <button className="btn sk" onClick={() => navigate(`/ar-lounge/${loungeId}`)}>
              3D AR 라운지
            </button>
            <button className="btn primary sk" onClick={() => navigate('/camera', { state: { intent: { kind: 'lounge', loungeId } } })}>
              ✍️ 여기에 손글씨 남기기
            </button>
            <div />
          </div>
        )}
      </div>
    </section>
  );
}
