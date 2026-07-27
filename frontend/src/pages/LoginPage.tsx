import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '@/api/authApi';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAppState();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!identifier.trim() || !password) {
      showToast('아이디와 비밀번호를 입력해주세요');
      return;
    }
    setSubmitting(true);
    try {
      await loginUser({ identifier: identifier.trim(), password });
      showToast('손끝에 오신 걸 환영해요 🎉');
      navigate('/feed', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '로그인에 실패했어요');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    try {
      await authApi.signInWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google 로그인을 시작하지 못했어요');
    }
  }

  return (
    <section className="screen active" id="screen-login">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div style={{ width: 36 }} />
      </div>
      <div className="onb-step active" style={{ padding: '6px 14px 20px 0', overflowY: 'auto' }}>
        <div className="screen-title">다시 만나서 반가워요</div>
        <p className="screen-sub">아이디 또는 이메일과 비밀번호를 입력해주세요</p>
        <div className="field">
          <label>아이디 또는 이메일</label>
          <input type="text" className="sk" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input
            type="password"
            className="sk"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="onb-spacer" />
        <button className="btn primary sk block" disabled={submitting} onClick={handleSubmit}>
          로그인
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>
        <button className="btn ghost sk block" onClick={handleGoogle}>
          Google로 계속하기
        </button>
        <button className="link-btn" style={{ marginTop: 14, alignSelf: 'center' }} onClick={() => navigate('/signup')}>
          계정이 없으신가요? 회원가입
        </button>
      </div>
    </section>
  );
}
