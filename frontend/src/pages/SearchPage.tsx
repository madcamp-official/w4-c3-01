import { useMemo, useState } from 'react';
import Avatar from '@/components/Avatar';
import { SEED_USERS } from '@/mock/store';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useToast } from '@/state/ToastContext';

export default function SearchPage() {
  const { posts } = useAppState();
  const { openViewer } = useOverlay();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const users = useMemo(() => SEED_USERS.filter((u) => !q || u.nickname.toLowerCase().includes(q)), [q]);
  const results = useMemo(
    () => posts.filter((p) => !q || p.caption.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)),
    [posts, q]
  );

  return (
    <section className="screen active" id="screen-search">
      <div className="logo" style={{ fontSize: 19, padding: '0 12px 10px 0' }}>
        검색
      </div>
      <div className="search-box">
        <div className="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx={11} cy={11} r={7} />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="sk"
            placeholder="아이디 또는 글씨로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="icon-btn sk" id="search-submit-btn" aria-label="검색" onClick={() => setQuery((v) => v)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx={11} cy={11} r={7} />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>
      <div className="search-body">
        {users.length ? (
          <>
            <h2 className="section-h">사용자</h2>
            {users.map((u) => (
              <button key={u.nickname} className="user-row" onClick={() => showToast(`${u.nickname} 님의 프로필은 준비 중이에요`)}>
                <Avatar nickname={u.nickname} color={u.color} size={36} fontSize={14} />
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
              <div
                key={p.id}
                className="cell"
                onClick={() => openViewer({ image: p.image, caption: p.caption, strokes: p.strokes })}
              >
                <img src={p.image} alt="" />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-note">검색 결과가 없어요</div>
        )}
      </div>
    </section>
  );
}
