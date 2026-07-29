import Icon from '@/components/Icon';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';

export default function ShareSheet() {
  const { sharePostId, closeShare, openSendToChat } = useOverlay();
  const { showToast } = useToast();
  const open = Boolean(sharePostId);

  function handleOption(kind: 'link' | 'chat') {
    const postId = sharePostId;
    closeShare();
    if (kind === 'link') {
      showToast('링크를 복사했어요');
    } else if (postId) {
      openSendToChat(postId);
    }
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
          <Icon name="send" />
          채팅으로 보내기
        </button>
      </div>
    </>
  );
}
