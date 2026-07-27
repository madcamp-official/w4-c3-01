import Icon from '@/components/Icon';
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
          <Icon name="link" />
          링크 복사
        </button>
        <button className="share-option" onClick={() => handleOption('chat')}>
          <Icon name="message-square" />
          채팅으로 보내기
        </button>
      </div>
    </>
  );
}
