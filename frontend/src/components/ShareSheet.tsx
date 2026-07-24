import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';

export default function ShareSheet() {
  const { sharePostId, closeShare } = useOverlay();
  const { showToast } = useToast();
  const open = Boolean(sharePostId);

  function handleOption(kind: 'link' | 'chat') {
    closeShare();
    showToast(kind === 'link' ? '링크를 복사했어요' : '채팅 목록에서 보낼 친구를 선택하세요');
  }

  return (
    <>
      <div className={'backdrop' + (open ? ' open' : '')} onClick={closeShare} />
      <div className={'sheet' + (open ? ' open' : '')}>
        <div className="sheet-handle" />
        <div className="sheet-title">공유하기</div>
        <button className="share-option" onClick={() => handleOption('link')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
            <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
          </svg>
          링크 복사
        </button>
        <button className="share-option" onClick={() => handleOption('chat')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          채팅으로 보내기
        </button>
      </div>
    </>
  );
}
