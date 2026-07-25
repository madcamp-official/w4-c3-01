import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarPicker from '@/components/AvatarPicker';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

export default function EditPhotoPage() {
  const navigate = useNavigate();
  const { session, setAvatar } = useAppState();
  const { showToast } = useToast();
  const [dataUrl, setDataUrl] = useState<string | null>(session?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  async function handleSave() {
    if (!dataUrl) {
      showToast('사진을 선택해주세요');
      return;
    }
    setSaving(true);
    try {
      await setAvatar(dataUrl);
      showToast('프로필 사진을 저장했어요');
      navigate('/mypage', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="screen active" id="screen-editphoto">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate('/mypage')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="logo" style={{ fontSize: 17 }}>
          프로필 사진 수정
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div className="onb-step active" style={{ padding: '20px 14px', alignItems: 'center' }}>
        <p className="screen-sub">새 사진을 선택하면 프로필에 바로 적용돼요</p>
        <div style={{ margin: '12px 0 28px' }}>
          <AvatarPicker dataUrl={dataUrl} nickname={session.nickname} color={session.avatarColor} size={120} onChange={setDataUrl} />
        </div>
        <button className="btn primary sk block" disabled={saving} onClick={handleSave}>
          저장
        </button>
      </div>
    </section>
  );
}
