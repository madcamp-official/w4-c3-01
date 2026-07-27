import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarPicker from '@/components/AvatarPicker';
import HeartAirwriteStage, { type HeartAirwriteHandle } from '@/components/HeartAirwriteStage';
import { useUsernameCheck, usernameStatusMessage, type UsernameStatus } from '@/hooks/useUsernameCheck';
import { defaultHeartUrl } from '@/mock/store';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

/** Google 등 OAuth로 처음 로그인한 사람이 아이디를 확인하고 하트를 그리는 필수 1회 화면. */
export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { session, setAvatar, setHeart, updateProfile } = useAppState();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [dataUrl, setDataUrl] = useState<string | null>(session?.avatarUrl ?? null);
  const [username, setUsername] = useState(session?.username ?? '');
  const [nickname, setNickname] = useState(session?.nickname ?? '');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const heartRef = useRef<HeartAirwriteHandle>(null);

  const usernameChanged = username.trim() !== session?.username;
  const liveStatus = useUsernameCheck(usernameChanged ? username : '', session?.id);
  const usernameStatus: UsernameStatus = usernameChanged ? liveStatus : 'available';
  const usernameHint = usernameChanged ? usernameStatusMessage(usernameStatus) : null;

  if (!session) return null;

  function handleNext() {
    if (usernameStatus !== 'available') {
      showToast('아이디를 확인해주세요');
      return;
    }
    if (!nickname.trim()) {
      showToast('이름을 입력해주세요');
      return;
    }
    setStep(2);
  }

  async function finishProfile(heartUrl: string) {
    setSaving(true);
    try {
      if (dataUrl && dataUrl !== session!.avatarUrl) await setAvatar(dataUrl);
      await setHeart(heartUrl);
      await updateProfile({ username: username.trim(), nickname: nickname.trim(), onboarded: true });
      showToast(`ALine에 오신 걸 환영해요, ${nickname.trim()}님 🎉`);
      navigate('/feed', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    const heartUrl = heartRef.current?.getDataUrl();
    if (heartUrl) void finishProfile(heartUrl);
  }

  function handleSkipHeart() {
    void finishProfile(defaultHeartUrl());
  }

  return (
    <section className="screen active" id="screen-completeprofile">
      <div className="onb-progress">
        <span className={step >= 1 ? 'on' : ''} />
        <span className={step >= 2 ? 'on' : ''} />
      </div>

      <div className={'onb-step' + (step === 1 ? ' active' : '')} style={{ padding: '12px 14px 20px' }}>
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
          <input type="text" className="sk blob-b" maxLength={16} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <button className="btn primary sk block" style={{ marginTop: 10 }} onClick={handleNext}>
          다음
        </button>
      </div>

      <div className={'onb-step' + (step === 2 ? ' active' : '')}>
        <div className="screen-title">당신만의 하트를 그려주세요</div>
        <p className="screen-sub">
          이 하트가 앞으로 좋아요 버튼이 돼요
          <br />
          카메라 앞에서 손가락으로 허공에 그려보세요
        </p>
        <div className="heart-tools">
          {step === 2 ? <HeartAirwriteStage ref={heartRef} onDrawStateChange={setHasDrawn} /> : null}
          <div className="btn-row">
            <button className="btn ghost sk blob-b" onClick={() => heartRef.current?.clear()}>
              지우기
            </button>
            <button className="btn primary sk" disabled={!hasDrawn || saving} onClick={handleDone}>
              완료
            </button>
          </div>
          <button className="link-btn" onClick={handleSkipHeart}>
            기본 하트로 시작할게요
          </button>
        </div>
      </div>
    </section>
  );
}
