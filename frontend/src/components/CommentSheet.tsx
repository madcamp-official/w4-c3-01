import { useState } from 'react';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';

export default function CommentSheet() {
  const { commentPostId, closeComments } = useOverlay();
  const { posts, commentOnPost } = useAppState();
  const [text, setText] = useState('');

  const post = commentPostId ? posts.find((p) => p.id === commentPostId) : undefined;
  const open = Boolean(post);

  async function handleSend() {
    if (!post || !text.trim()) return;
    await commentOnPost(post.id, text.trim());
    setText('');
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
            post?.comments.map((c, i) => (
              <div className="comment-item" key={i}>
                <Avatar nickname={c.user} color="#E3D9BB" size={26} fontSize={10} />
                <div>
                  <b>{c.user}</b>
                  {c.text}
                </div>
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
