import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarPicker from '@/components/AvatarPicker';
import Icon from '@/components/Icon';
import { useUsernameCheck, usernameStatusMessage, type UsernameStatus } from '@/hooks/useUsernameCheck';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { session, setAvatar, updateProfile } = useAppState();
  const { showToast } = useToast();

  const [dataUrl, setDataUrl] = useState<string | null>(session?.avatarUrl ?? null);
  const [username, setUsername] = useState(session?.username ?? '');
  const [nickname, setNickname] = useState(session?.nickname ?? '');
  const [saving, setSaving] = useState(false);

  const usernameChanged = username.trim() !== session?.username;
  const liveStatus = useUsernameCheck(usernameChanged ? username : '', session?.id);
  const usernameStatus: UsernameStatus = usernameChanged ? liveStatus : 'available';
  const usernameHint = usernameChanged ? usernameStatusMessage(usernameStatus) : null;

  if (!session) return null;

  async function handleSave() {
    if (usernameStatus !== 'available') {
      showToast('아이디를 확인해주세요');
      return;
    }
    if (!nickname.trim()) {
      showToast('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      if (dataUrl && dataUrl !== session!.avatarUrl) await setAvatar(dataUrl);
      await updateProfile({ username: username.trim(), nickname: nickname.trim() });
      showToast('프로필을 저장했어요');
      navigate('/mypage', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="screen active" id="screen-editprofile">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate('/mypage')}>
          <Icon name="chevron-left" size={24} strokeWidth={2.3} />
        </button>
        <div className="logo" style={{ fontSize: 17 }}>
          프로필 수정
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div className="onb-step active" style={{ padding: '20px 14px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 24px' }}>
          <AvatarPicker dataUrl={dataUrl} nickname={session.nickname} color={session.avatarColor} size={100} onChange={setDataUrl} />
        </div>
        <div className="field">
          <label>아이디</label>
          <input type="text" className="sk" value={username} onChange={(e) => setUsername(e.target.value)} />
          {usernameHint ? <p style={{ fontSize: 11, color: usernameHint.color, margin: '6px 0 0' }}>{usernameHint.text}</p> : null}
        </div>
        <div className="field">
          <label>이름</label>
          <input type="text" className="sk blob-b" maxLength={16} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <button className="btn primary sk block" style={{ marginTop: 10 }} disabled={saving} onClick={handleSave}>
          저장
        </button>
      </div>
    </section>
  );
}
