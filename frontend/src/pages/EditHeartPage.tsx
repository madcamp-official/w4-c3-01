import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeartAirwriteStage, { type HeartAirwriteHandle } from '@/components/HeartAirwriteStage';
import Icon from '@/components/Icon';
import { defaultHeartUrl } from '@/mock/store';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

export default function EditHeartPage() {
  const navigate = useNavigate();
  const { setHeart } = useAppState();
  const { showToast } = useToast();
  const [hasDrawn, setHasDrawn] = useState(false);
  const heartRef = useRef<HeartAirwriteHandle>(null);

  async function saveHeart(dataUrl: string) {
    await setHeart(dataUrl);
    showToast('하트를 새로 저장했어요');
    navigate('/mypage', { replace: true });
  }

  function handleSave() {
    const dataUrl = heartRef.current?.getDataUrl();
    if (dataUrl) void saveHeart(dataUrl);
  }

  function handleUseDefault() {
    void saveHeart(defaultHeartUrl());
  }

  return (
    <section className="screen active" id="screen-editheart">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate('/mypage')}>
          <Icon name="chevron-left" size={24} strokeWidth={2.3} />
        </button>
        <div className="logo" style={{ fontSize: 17 }}>
          하트 다시 그리기
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div className="onb-step active" style={{ padding: '4px 14px 20px 0' }}>
        <p className="screen-sub">
          새 하트를 그리면 지금까지의 좋아요 표시에도 바로 적용돼요
          <br />
          카메라 앞에서 손가락으로 허공에 그려보세요
        </p>
        <div className="heart-tools">
          <HeartAirwriteStage ref={heartRef} onDrawStateChange={setHasDrawn} />
          <div className="btn-row">
            <button className="btn ghost sk blob-b" onClick={() => heartRef.current?.clear()}>
              지우기
            </button>
            <button className="btn primary sk" disabled={!hasDrawn} onClick={handleSave}>
              저장
            </button>
          </div>
          <button className="link-btn" onClick={handleUseDefault}>
            기본 하트로 변경할게요
          </button>
        </div>
      </div>
    </section>
  );
}
