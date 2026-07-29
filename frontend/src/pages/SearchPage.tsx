import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import TopBar from '@/components/TopBar';
import * as userApi from '@/api/userApi';
import { useAppState } from '@/state/AppStateContext';
import type { UserSummary } from '@/types';

export default function SearchPage() {
  const navigate = useNavigate();
  const { posts, session, loadChats } = useAppState();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);

  const q = query.trim().toLowerCase();

  useEffect(() => {
    void loadChats(); // keeps TopBar's unread-chat dot fresh
  }, [loadChats]);

  useEffect(() => {
    if (!session || !q) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    userApi.searchUsers(query, session.id).then((result) => {
      if (!cancelled) setUsers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [query, q, session]);

  const results = useMemo(
    () => (q ? posts.filter((p) => p.caption.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)) : []),
    [posts, q]
  );

  return (
    <section className="screen active" id="screen-search">
      <TopBar />
      <div className="search-box">
        <div className="search-input-wrap">
          <input
            type="text"
            className="sk"
            placeholder="아이디 또는 닉네임으로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="icon-btn sk" id="search-submit-btn" aria-label="검색" onClick={() => setQuery((v) => v)}>
          <Icon name="search" className="" />
        </button>
      </div>
      {q ? (
        <div className="search-body">
          {users.length ? (
            <>
              <h2 className="section-h">사용자</h2>
              {users.map((u) => (
                <button key={u.id} className="user-row" onClick={() => navigate(`/users/${u.id}`)}>
                  <Avatar nickname={u.nickname} color={u.avatarColor} size={36} fontSize={14} avatarUrl={u.avatarUrl} />
                  <b>{u.nickname}</b>
                </button>
              ))}
            </>
          ) : null}
          <h2 className="section-h" style={{ marginTop: 14 }}>
            게시물
          </h2>
          {results.length ? (
            <div className="grid3">
              {results.map((p) => (
                <div key={p.id} className="cell" onClick={() => navigate(`/posts/${p.id}`)}>
                  <img src={p.image} alt="" />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-note" style={{ textAlign: 'left', padding: 0 }}>
              검색 결과가 없어요
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
