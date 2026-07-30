// Ported from mobile/src/components/PostMenu.tsx — keep in sync. Shared
// "more" menu for a post's own author: a dropdown anchored under the kebab
// icon with "수정하기"/"삭제하기" items (a divider between them when both are
// shown). Edit hands off to the caller (the feed's list navigates to the
// same Preview page used before posting, with the button relabeled); delete
// opens a confirm modal styled like LoungeListScreen's own delete-confirm
// modal (same layout/spacing, ported to CSS/theme variables here). Renders
// nothing for posts that aren't the viewer's own.
import { useState } from 'react';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import type { Post } from '@/types';

export default function PostMenu({
  post,
  iconClassName = 'action-btn',
  /** Only the feed's scrolling list offers editing — the permalink page
   * (reached from chat-shared posts, notifications, etc.) keeps just delete. */
  onEdit,
  onDeleted
}: {
  post: Post;
  iconClassName?: string;
  onEdit?: () => void;
  /** Called after the post is actually deleted — e.g. PostDetailPage uses
   * this to navigate back, since the permalink it's showing no longer exists. */
  onDeleted?: () => void;
}) {
  const { deletePost } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!post.mine) return null;

  async function handleConfirmDelete() {
    setConfirmOpen(false);
    await deletePost(post.id);
    onDeleted?.();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={iconClassName}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        aria-label="게시물 메뉴"
      >
        <Icon name="more-vertical" />
      </button>

      {menuOpen ? (
        <>
          <div className="post-menu-scrim" onClick={() => setMenuOpen(false)} />
          <div className="post-menu-dropdown">
            {onEdit ? (
              <>
                <button
                  className="post-menu-item post-menu-item-ink"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                >
                  수정하기
                </button>
                <div className="post-menu-divider" />
              </>
            ) : null}
            <button
              className="post-menu-item"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
            >
              삭제하기
            </button>
          </div>
        </>
      ) : null}

      {confirmOpen ? (
        <div className="post-confirm-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="post-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="post-confirm-icon">
              <Icon name="trash-2" size={22} className="" />
            </div>
            <div className="post-confirm-title">이 게시물을 삭제할까요?</div>
            <div className="post-confirm-description">삭제한 게시물은 되돌릴 수 없어요.</div>
            <div className="post-confirm-actions">
              <button className="post-confirm-btn post-confirm-cancel" onClick={() => setConfirmOpen(false)}>
                취소
              </button>
              <button className="post-confirm-btn post-confirm-delete" onClick={handleConfirmDelete}>
                삭제하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
