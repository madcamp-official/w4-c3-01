import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '@/api/authApi';
import AvatarPicker from '@/components/AvatarPicker';
import HeartAirwriteStage, { type HeartAirwriteHandle } from '@/components/HeartAirwriteStage';
import Icon from '@/components/Icon';
import { useUsernameCheck, usernameStatusMessage } from '@/hooks/useUsernameCheck';
import { AVATAR_TONES, defaultHeartUrl } from '@/mock/store';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/;

function passwordHint(password: string): { text: string; color: string } | null {
  if (!password) return null;
  if (PASSWORD_RULE.test(password)) return { text: '사용할 수 있는 비밀번호예요', color: 'var(--ink-soft)' };
  return { text: '8~12자, 영문·숫자·특수문자를 모두 포함해주세요', color: 'var(--danger)' };
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { signupUser } = useAppState();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ username: '', email: '', nickname: '', password: '', password2: '' });
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const heartRef = useRef<HeartAirwriteHandle>(null);

  const usernameStatus = useUsernameCheck(form.username);
  const usernameHint = usernameStatusMessage(usernameStatus);
  const pwHint = passwordHint(form.password);
  const passwordValid = PASSWORD_RULE.test(form.password);

  const step1Filled = Object.values(form).every((v) => v.trim().length > 0);
  const canGoNext = step1Filled && usernameStatus === 'available' && passwordValid;

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    if (form.password !== form.password2) {
      showToast('비밀번호가 일치하지 않아요');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      showToast('이메일 형식을 확인해주세요');
      return;
    }
    setStep(2);
  }

  async function finishOnboarding(heartUrl: string) {
    try {
      await signupUser({
        username: form.username.trim(),
        email: form.email.trim(),
        nickname: form.nickname.trim(),
        password: form.password,
        heartUrl,
        avatarUrl: avatarDataUrl
      });
      showToast(`ALine에 오신 걸 환영해요, ${form.nickname.trim()}님 🎉`);
      navigate('/feed', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '회원가입에 실패했어요');
    }
  }

  function handleDone() {
    const dataUrl = heartRef.current?.getDataUrl();
    if (dataUrl) void finishOnboarding(dataUrl);
  }

  function handleSkip() {
    void finishOnboarding(defaultHeartUrl());
  }

  async function handleGoogle() {
    try {
      await authApi.signInWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google 로그인을 시작하지 못했어요');
    }
  }

  function handleBack() {
    if (step === 1) navigate('/');
    else setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  return (
    <section className="screen active" id="screen-onboarding">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <button className="icon-btn sk" onClick={handleBack}>
          <Icon name="chevron-left" size={24} strokeWidth={2.3} />
        </button>
        <div style={{ width: 36 }} />
      </div>
      <div className="onb-progress">
        <span className={step >= 1 ? 'on' : ''} />
        <span className={step >= 2 ? 'on' : ''} />
        <span className={step >= 3 ? 'on' : ''} />
      </div>

      <div className={'onb-step' + (step === 1 ? ' active' : '')}>
        <div className="screen-title">반가워요 👋</div>
        <p className="screen-sub">ALine에서 활동할 계정을 만들어주세요</p>
        <div className="field">
          <label>아이디</label>
          <input
            type="text"
            className="sk"
            placeholder="영문, 숫자 조합"
            value={form.username}
            onChange={(e) => updateField('username', e.target.value)}
          />
          {usernameHint ? (
            <p style={{ fontSize: 11, color: usernameHint.color, margin: '6px 0 0' }}>{usernameHint.text}</p>
          ) : null}
        </div>
        <div className="field">
          <label>이메일</label>
          <input
            type="text"
            className="sk blob-b"
            placeholder="example@email.com"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </div>
        <div className="field">
          <label>이름</label>
          <input
            type="text"
            className="sk"
            maxLength={16}
            value={form.nickname}
            onChange={(e) => updateField('nickname', e.target.value)}
          />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input
            type="password"
            className="sk blob-b"
            placeholder="8~12자, 영문·숫자·특수문자 포함"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
          />
          {pwHint ? <p style={{ fontSize: 11, color: pwHint.color, margin: '6px 0 0' }}>{pwHint.text}</p> : null}
        </div>
        <div className="field">
          <label>비밀번호 확인</label>
          <input
            type="password"
            className="sk"
            value={form.password2}
            onChange={(e) => updateField('password2', e.target.value)}
          />
        </div>
        <button className="btn primary sk block" disabled={!canGoNext} onClick={handleNext}>
          다음
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>
        <button className="btn ghost sk block blob-b" onClick={handleGoogle}>
          Google로 계속하기
        </button>
        <button className="link-btn" style={{ marginTop: 12, alignSelf: 'center' }} onClick={() => navigate('/login')}>
          이미 계정이 있으신가요? 로그인
        </button>
      </div>

      <div className={'onb-step' + (step === 2 ? ' active' : '')} style={{ alignItems: 'center' }}>
        <div className="screen-title">프로필 사진을 넣어볼까요?</div>
        <p className="screen-sub">
          나중에 마이페이지에서 언제든 바꿀 수 있어요
          <br />
          건너뛰어도 괜찮아요
        </p>
        <div style={{ margin: '12px 0 24px' }}>
          {step === 2 ? (
            <AvatarPicker
              dataUrl={avatarDataUrl}
              nickname={form.nickname || '?'}
              color={AVATAR_TONES[0]}
              size={120}
              onChange={setAvatarDataUrl}
            />
          ) : null}
        </div>
        <button className="btn primary sk block" onClick={() => setStep(3)}>
          다음
        </button>
        <button className="link-btn" style={{ marginTop: 12 }} onClick={() => setStep(3)}>
          건너뛸게요
        </button>
      </div>

      <div className={'onb-step' + (step === 3 ? ' active' : '')}>
        <div className="screen-title">당신만의 하트를 그려주세요</div>
        <p className="screen-sub">
          이 하트가 앞으로 좋아요 버튼이 돼요
          <br />
          카메라 앞에서 손가락으로 허공에 그려보세요
        </p>
        <div className="heart-tools">
          {step === 3 ? <HeartAirwriteStage ref={heartRef} onDrawStateChange={setHasDrawn} /> : null}
          <div className="btn-row">
            <button className="btn ghost sk blob-b" onClick={() => heartRef.current?.clear()}>
              지우기
            </button>
            <button className="btn primary sk" disabled={!hasDrawn} onClick={handleDone}>
              완료
            </button>
          </div>
          <button className="link-btn" onClick={handleSkip}>
            기본 하트로 시작할게요
          </button>
        </div>
      </div>
    </section>
  );
}
