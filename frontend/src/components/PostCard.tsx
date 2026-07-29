import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import LikeButton from '@/components/LikeButton';
import { useOverlay } from '@/state/OverlayContext';
import type { Post } from '@/types';

/** Compact list-mode card — see FeedPage.tsx for the swipeable story-card mode (a separate renderer). */
export default function PostCard({ post }: { post: Post }) {
  const navigate = useNavigate();
  const { openComments, openShare } = useOverlay();

  return (
    <article className="post post-vertical sk-hr-b">
      <div className="post-head">
        <Avatar nickname={post.username} color={post.avatarColor} size={32} fontSize={13} avatarUrl={post.avatarUrl} />
        <div className="who">
          <b>{post.username}</b>
          <small>{post.time}</small>
        </div>
      </div>
      <div className="post-media" onClick={() => navigate(`/posts/${post.id}`)}>
        <img src={post.image} alt="" />
      </div>
      <div className="post-actions">
        <LikeButton post={post} />
        <button className="action-btn" onClick={() => openComments(post.id)}>
          <Icon name="message-circle" />
        </button>
        <button className="action-btn" onClick={() => openShare(post.id)}>
          <Icon name="send" />
        </button>
      </div>
      <div className="post-meta">
        <div className="likes">좋아요 {post.likes}개</div>
        <div className="caption">
          <span>{post.username}</span>
          {post.caption}
        </div>
        {post.comments.length ? (
          <div className="time" style={{ marginBottom: 2, cursor: 'pointer' }} onClick={() => openComments(post.id)}>
            댓글 {post.comments.length}개 모두 보기
          </div>
        ) : null}
        <div className="time">{post.time}</div>
      </div>
    </article>
  );
}
