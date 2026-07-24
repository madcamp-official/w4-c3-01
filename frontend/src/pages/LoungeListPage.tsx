import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

export default function LoungeListPage() {
  const navigate = useNavigate();
  const { lounges, loadLounges } = useAppState();
  const { showToast } = useToast();

  useEffect(() => {
    void loadLounges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScanQr() {
    showToast('QR 스캔 시뮬레이션: "우리집 앞 벽" 라운지로 입장');
    navigate('/lounges/l3');
  }

  return (
    <section className="screen active" id="screen-loungelist">
      <div className="logo" style={{ fontSize: 19, padding: '0 14px 6px 0' }}>
        라운지
      </div>
      <p className="screen-sub" style={{ textAlign: 'left', margin: '0 14px 12px 0' }}>
        특정 장소에서만 열리는 손글씨 공간이에요. 같은 곳에 가면 남이 남긴 글씨를 볼 수 있어요.
      </p>
      <div className="qr-row">
        <div className="qr-box sk">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x={3} y={3} width={7} height={7} />
            <rect x={14} y={3} width={7} height={7} />
            <rect x={3} y={14} width={7} height={7} />
            <path d="M14 14h3v3h-3zM19 14h2v2M14 19h2v2M19 19h2v2" />
          </svg>
        </div>
        <button className="btn sk" style={{ flex: 1 }} onClick={handleScanQr}>
          QR로 라운지 입장
        </button>
      </div>
      <div className="lounge-list">
        {lounges.map((l) => (
          <div key={l.id} className="lounge-card sk" onClick={() => navigate(`/lounges/${l.id}`)}>
            <div className="lounge-emoji sk">{l.emoji}</div>
            <div className="lounge-info">
              <b>{l.name}</b>
              <span>
                {l.desc} · 손글씨 {l.items.length}개
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
