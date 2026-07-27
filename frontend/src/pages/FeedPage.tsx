import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PostCard from '@/components/PostCard';
import { useAppState } from '@/state/AppStateContext';

export default function FeedPage() {
  const navigate = useNavigate();
  const { posts, loadFeed } = useAppState();

  useEffect(() => {
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="screen active" id="screen-feed">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <div className="logo">
          <span className="dot" />
          ALine
        </div>
        <button className="icon-btn sk" onClick={() => navigate('/chats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="icon-sk">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
      <div className="hatch" />
      <div className="feed-list">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
