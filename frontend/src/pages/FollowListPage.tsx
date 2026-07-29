import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import * as followApi from '@/api/followApi';
import type { UserSummary } from '@/types';

export default function FollowListPage({ mode }: { mode: 'followers' | 'following' }) {
  const navigate = useNavigate();
  const { userId = '' } = useParams();
  const [users, setUsers] = useState<UserSummary[] | null>(null);

  useEffect(() => {
    setUsers(null);
    let cancelled = false;
    const fetcher = mode === 'followers' ? followApi.fetchFollowers : followApi.fetchFollowing;
    fetcher(userId).then((result) => {
      if (!cancelled) setUsers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, mode]);

  return (
    <section className="screen active" id="screen-followlist">
      <div className="statusbar" style={{ padding: '0 14px 8px 0' }}>
        <button className="icon-btn sk" onClick={() => navigate(-1)}>
          <Icon name="chevron-left" size={24} strokeWidth={2.3} />
        </button>
        <b>{mode === 'followers' ? '팔로워' : '팔로잉'}</b>
        <div style={{ width: 36 }} />
      </div>
      {users === null ? null : users.length === 0 ? (
        <div className="empty-note">{mode === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로우한 사람이 없어요'}</div>
      ) : (
        users.map((u) => (
          <button key={u.id} className="user-row" onClick={() => navigate(`/users/${u.id}`)}>
            <Avatar nickname={u.nickname} color={u.avatarColor} size={40} fontSize={14} avatarUrl={u.avatarUrl} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <b>{u.nickname}</b>
              <span style={{ fontSize: 11.5 }}>@{u.username}</span>
            </div>
          </button>
        ))
      )}
    </section>
  );
}
