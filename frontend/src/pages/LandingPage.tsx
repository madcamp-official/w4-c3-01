import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <section className="screen active" id="screen-landing">
      <div className="onb-spacer" />
      <div style={{ textAlign: 'center', padding: '0 26px' }}>
        <div className="logo" style={{ fontSize: 36, justifyContent: 'center', marginBottom: 12 }}>
          <span className="dot" />
          ALine
        </div>
        <p className="screen-sub" style={{ margin: '0 6px 34px' }}>
          손으로 그리고, 허공에 쓰는
          <br />
          당신만의 SNS
        </p>
      </div>
      <div style={{ padding: '0 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn primary sk block" onClick={() => navigate('/login')}>
          로그인
        </button>
        <button className="btn ghost sk block blob-b" onClick={() => navigate('/signup')}>
          회원가입
        </button>
      </div>
      <div className="onb-spacer" />
    </section>
  );
}
