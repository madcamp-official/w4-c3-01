import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';

export default function LogoutSheet() {
  const { logoutOpen, closeLogout } = useOverlay();
  const { logoutUser } = useAppState();
  const { showToast } = useToast();
  const navigate = useNavigate();

  function handleLogout() {
    closeLogout();
    logoutUser();
    showToast('로그아웃 했어요 👋');
    navigate('/', { replace: true });
  }

  return (
    <>
      <div className={'backdrop' + (logoutOpen ? ' open' : '')} onClick={closeLogout} />
      <div className={'sheet' + (logoutOpen ? ' open' : '')}>
        <div className="sheet-handle" />
        <div className="sheet-title">계정</div>
        <button className="btn ghost sk block" style={{ color: 'var(--danger)', marginBottom: 10 }} onClick={handleLogout}>
          로그아웃
        </button>
        <button className="link-btn" style={{ alignSelf: 'center' }} onClick={closeLogout}>
          취소
        </button>
      </div>
    </>
  );
}
