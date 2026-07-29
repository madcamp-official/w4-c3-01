import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import TopBar from '@/components/TopBar';
import * as followApi from '@/api/followApi';
import type { FollowCounts } from '@/api/followApi';
import { useAppState } from '@/state/AppStateContext';

export default function MyPage() {
  const navigate = useNavigate();
  const { session, posts, loadChats } = useAppState();
  const [tab, setTab] = useState<'posts' | 'likes'>('posts');
  const [counts, setCounts] = useState<FollowCounts | null>(null);

  const myPosts = useMemo(() => posts.filter((p) => p.mine), [posts]);
  const likedPosts = useMemo(() => posts.filter((p) => p.liked), [posts]);
  const items = tab === 'posts' ? myPosts : likedPosts;

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    followApi.fetchFollowCounts(session.id).then((result) => {
      if (!cancelled) setCounts(result);
    });
    void loadChats(); // keeps TopBar's unread-chat dot fresh
    return () => {
      cancelled = true;
    };
  }, [session, loadChats]);

  if (!session) return null;

  return (
    <section className="screen active" id="screen-mypage">
      <TopBar />
      <div className="profile-card">
        <Avatar nickname={session.nickname} color={session.avatarColor} size={61} fontSize={20} avatarUrl={session.avatarUrl} />
        <div className="profile-names">
          <b>{session.nickname}</b>
          <span>{session.username ? '@' + session.username : 'ALine에서 손글씨로 이야기해요'}</span>
        </div>
        <div className="profile-stats">
          <div>
            <b>{myPosts.length}</b>
            <span>게시물</span>
          </div>
          <button onClick={() => navigate(`/users/${session.id}/followers`)}>
            <b>{counts?.followers ?? ''}</b>
            <span>팔로워</span>
          </button>
          <button onClick={() => navigate(`/users/${session.id}/following`)}>
            <b>{counts?.following ?? ''}</b>
            <span>팔로잉</span>
          </button>
        </div>
      </div>
      <div className="profile-actions">
        <button className="btn ghost sk block" onClick={() => navigate('/mypage/edit')}>
          프로필 수정
        </button>
        <button className="btn ghost sk block blob-b" onClick={() => navigate('/mypage/heart')}>
          하트 다시 그리기
        </button>
      </div>
      <div className="tabbar">
        <button className={tab === 'posts' ? 'active' : ''} onClick={() => setTab('posts')}>
          내 게시물
        </button>
        <button className={tab === 'likes' ? 'active' : ''} onClick={() => setTab('likes')}>
          좋아요한 게시물
        </button>
      </div>
      <div className="mypage-body">
        {items.length === 0 ? (
          <div className="empty-note">
            {tab === 'posts' ? '아직 올린 게시물이 없어요. + 버튼으로 첫 손글씨를 남겨보세요.' : '좋아요를 누른 게시물이 여기 모여요.'}
          </div>
        ) : (
          <div className="grid3">
            {items.map((p) => (
              <div key={p.id} className="cell" onClick={() => navigate(`/posts/${p.id}`)}>
                <img src={p.image} alt="" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
