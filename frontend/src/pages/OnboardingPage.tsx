import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeartCanvas, { type HeartCanvasHandle } from '@/components/HeartCanvas';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { signupUser } = useAppState();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ username: '', email: '', nickname: '', password: '', password2: '' });
  const [hasDrawn, setHasDrawn] = useState(false);
  const heartRef = useRef<HeartCanvasHandle>(null);

  const step1Filled = Object.values(form).every((v) => v.trim().length > 0);

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
    await signupUser({
      username: form.username.trim(),
      email: form.email.trim(),
      nickname: form.nickname.trim(),
      password: form.password,
      heartUrl
    });
    showToast(`손끝에 오신 걸 환영해요, ${form.nickname.trim()}님 🎉`);
    navigate('/feed', { replace: true });
  }

  function handleDone() {
    const dataUrl = heartRef.current?.getDataUrl();
    if (dataUrl) void finishOnboarding(dataUrl);
  }

  function handleSkip() {
    heartRef.current?.fillDefault();
    const dataUrl = heartRef.current?.getDataUrl();
    if (dataUrl) void finishOnboarding(dataUrl);
  }

  return (
    <section className="screen active" id="screen-onboarding">
      <div className="onb-progress">
        <span className={step >= 1 ? 'on' : ''} />
        <span className={step >= 2 ? 'on' : ''} />
      </div>

      <div className={'onb-step' + (step === 1 ? ' active' : '')}>
        <div className="screen-title">반가워요 👋</div>
        <p className="screen-sub">손끝에서 활동할 계정을 만들어주세요</p>
        <div className="field">
          <label>아이디</label>
          <input
            type="text"
            className="sk"
            placeholder="영문, 숫자 조합"
            value={form.username}
            onChange={(e) => updateField('username', e.target.value)}
          />
        </div>
        <div className="field">
          <label>이메일</label>
          <input
            type="text"
            className="sk"
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
            placeholder="예: 김하은"
            maxLength={16}
            value={form.nickname}
            onChange={(e) => updateField('nickname', e.target.value)}
          />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input
            type="password"
            className="sk"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
          />
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
        <button className="btn primary sk block" disabled={!step1Filled} onClick={handleNext}>
          다음
        </button>
        <button className="link-btn" style={{ marginTop: 12, alignSelf: 'center' }} onClick={() => navigate('/login')}>
          이미 계정이 있으신가요? 로그인
        </button>
      </div>

      <div className={'onb-step' + (step === 2 ? ' active' : '')}>
        <div className="screen-title">당신만의 하트를 그려주세요</div>
        <p className="screen-sub">
          이 하트가 앞으로 좋아요 버튼이 돼요
          <br />
          완벽하지 않아도 괜찮아요
        </p>
        <div className="heart-tools">
          {step === 2 ? <HeartCanvas ref={heartRef} onDrawStateChange={setHasDrawn} /> : null}
          <div className="btn-row">
            <button className="btn ghost sk" onClick={() => heartRef.current?.clear()}>
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
