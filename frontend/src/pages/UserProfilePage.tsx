import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import * as followApi from '@/api/followApi';
import * as postsApi from '@/api/postsApi';
import * as userApi from '@/api/userApi';
import { useAppState } from '@/state/AppStateContext';
import { useToast } from '@/state/ToastContext';
import type { FollowCounts } from '@/api/followApi';
import type { Post, UserSummary } from '@/types';

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { userId = '' } = useParams();
  const { session, startConversationWith } = useAppState();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  // This user's own posts only — never their likes, which is what the
  // global (follow-scoped) `posts` state can't show for someone the current
  // user doesn't follow anyway.
  const [authorPosts, setAuthorPosts] = useState<Post[] | null>(null);

  const isOwnProfile = Boolean(session && userId === session.id);

  useEffect(() => {
    if (!session || isOwnProfile) return;
    setLoaded(false); // 다른 프로필로 바로 넘어갈 때 이전 사람 정보가 잠깐 보이지 않도록
    setAuthorPosts(null);
    let cancelled = false;
    (async () => {
      const [p, c, isFollowing, userPosts] = await Promise.all([
        userApi.fetchProfile(userId),
        followApi.fetchFollowCounts(userId),
        followApi.isFollowing(session.id, userId),
        postsApi.fetchPostsByAuthor(userId, session.id)
      ]);
      if (cancelled) return;
      setProfile(p ?? null);
      setCounts(c);
      setFollowing(isFollowing);
      setAuthorPosts(userPosts);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, session, isOwnProfile]);

  const postCount = authorPosts?.length ?? 0;

  if (isOwnProfile) return <Navigate to="/mypage" replace />;

  async function handleToggleFollow() {
    if (!session) return;
    setBusy(true);
    try {
      if (following) {
        await followApi.unfollowUser(session.id, userId);
        setFollowing(false);
        setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        await followApi.followUser(session.id, userId);
        setFollowing(true);
        setCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '처리하지 못했어요');
    } finally {
      setBusy(false);
    }
  }

  async function handleChat() {
    const chatId = await startConversationWith(userId);
    if (!chatId) {
      showToast('채팅은 아직 준비 중이에요');
      return;
    }
    navigate(`/chats/${chatId}`);
  }

  return (
    <section className="screen active" id="screen-userprofile">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate(-1)}>
          <Icon name="chevron-left" size={24} strokeWidth={2.3} />
        </button>
        <div style={{ width: 36 }} />
      </div>

      {!loaded ? null : !profile ? (
        <div className="empty-note">사용자를 찾을 수 없어요</div>
      ) : (
        <>
          <div className="profile-card" style={{ marginTop: 26 }}>
            <Avatar nickname={profile.nickname} color={profile.avatarColor} size={61} fontSize={20} avatarUrl={profile.avatarUrl} />
            <div className="profile-names">
              <b>{profile.nickname}</b>
              <span>@{profile.username}</span>
            </div>
            <div className="profile-stats">
              <div>
                <b>{postCount}</b>
                <span>게시물</span>
              </div>
              <button onClick={() => navigate(`/users/${userId}/followers`)}>
                <b>{counts.followers}</b>
                <span>팔로워</span>
              </button>
              <button onClick={() => navigate(`/users/${userId}/following`)}>
                <b>{counts.following}</b>
                <span>팔로잉</span>
              </button>
            </div>
          </div>
          <div className="profile-actions">
            <button className={'btn sk block' + (following ? ' ghost' : ' primary')} disabled={busy} onClick={handleToggleFollow}>
              {following ? '팔로잉' : '팔로우'}
            </button>
            <button className="btn ghost sk block blob-b" onClick={handleChat}>
              채팅하기
            </button>
          </div>
          {authorPosts && authorPosts.length === 0 ? (
            <div className="empty-note">아직 올린 게시물이 없어요</div>
          ) : (
            <div className="grid3" style={{ marginTop: 6 }}>
              {(authorPosts ?? []).map((p) => (
                <div key={p.id} className="cell" onClick={() => navigate(`/posts/${p.id}`)}>
                  <img src={p.image} alt="" />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
