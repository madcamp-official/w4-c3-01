import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarPicker from '@/components/AvatarPicker';
import { useUsernameCheck, usernameStatusMessage, type UsernameStatus } from '@/hooks/useUsernameCheck';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

/** Google 등 OAuth로 처음 로그인한 사람이 자동 생성된 아이디를 확인/수정하는 필수 1회 화면. */
export default function CompleteProfilePage() {
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
      await updateProfile({ username: username.trim(), nickname: nickname.trim(), onboarded: true });
      showToast(`손끝에 오신 걸 환영해요, ${nickname.trim()}님 🎉`);
      navigate('/feed', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="screen active" id="screen-completeprofile">
      <div className="onb-step active" style={{ padding: '32px 14px 20px', overflowY: 'auto' }}>
        <div className="screen-title">거의 다 됐어요 👋</div>
        <p className="screen-sub">
          Google 계정으로 로그인하셨네요. 아이디를 자동으로 만들어뒀어요
          <br />
          마음에 안 들면 지금 바꿔주세요
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 24px' }}>
          <AvatarPicker dataUrl={dataUrl} nickname={session.nickname} color={session.avatarColor} size={100} onChange={setDataUrl} />
        </div>
        <div className="field">
          <label>아이디</label>
          <input type="text" className="sk" value={username} onChange={(e) => setUsername(e.target.value)} />
          {usernameHint ? <p style={{ fontSize: 11, color: usernameHint.color, margin: '6px 0 0' }}>{usernameHint.text}</p> : null}
        </div>
        <div className="field">
          <label>이름</label>
          <input type="text" className="sk" maxLength={16} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <button className="btn primary sk block" style={{ marginTop: 10 }} disabled={saving} onClick={handleSave}>
          시작하기
        </button>
      </div>
    </section>
  );
}
