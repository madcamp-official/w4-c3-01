import { useState } from 'react';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';

export default function CommentSheet() {
  const { commentPostId, closeComments } = useOverlay();
  const { session, posts, commentOnPost, deleteComment } = useAppState();
  const { showToast } = useToast();
  const [text, setText] = useState('');

  const post = commentPostId ? posts.find((p) => p.id === commentPostId) : undefined;
  const open = Boolean(post);

  async function handleSend() {
    if (!post || !text.trim()) return;
    try {
      await commentOnPost(post.id, text.trim());
      setText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '댓글을 등록하지 못했어요');
    }
  }

  async function handleDelete(commentId: number) {
    if (!post) return;
    try {
      await deleteComment(post.id, commentId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '댓글을 삭제하지 못했어요');
    }
  }

  return (
    <>
      <div className={'backdrop' + (open ? ' open' : '')} onClick={closeComments} />
      <div className={'sheet' + (open ? ' open' : '')}>
        <div className="sheet-handle" />
        <div className="sheet-title">댓글</div>
        <div className="comment-list">
          {post && post.comments.length === 0 ? (
            <div className="empty-note">아직 댓글이 없어요. 첫 댓글을 남겨보세요!</div>
          ) : (
            post?.comments.map((c) => (
              <div className="comment-item" key={c.id}>
                <Avatar nickname={c.user} color={c.avatarColor ?? '#E3D9BB'} avatarUrl={c.avatarUrl} size={26} fontSize={10} />
                <div>
                  <b>{c.user}</b>
                  {c.text}
                </div>
                {session?.id === c.authorId ? (
                  <button className="comment-delete" onClick={() => handleDelete(c.id)} aria-label="댓글 삭제">
                    <Icon name="x" size={13} />
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
        <div className="comment-input-row">
          <input
            type="text"
            className="sk"
            placeholder="댓글 달기..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="round-icon send sk" onClick={handleSend} aria-label="댓글 등록">
            <Icon name="send" size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
