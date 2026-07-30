function initial(name: string): string {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

export default function Avatar({
  nickname,
  size,
  fontSize,
  avatarUrl,
  outline,
  allowDataUrl
}: {
  nickname: string;
  /** No longer drives the no-photo fallback background (now a flat theme
   * gray, see below) — kept required so call sites don't need to change. */
  color: string;
  size: number;
  fontSize: number;
  avatarUrl?: string | null;
  /** Plain outline circle with no color fill (matches week4_1's mypage avatar) instead of the usual colored-fill identity avatar. */
  outline?: boolean;
  /** AvatarPicker's own live preview passes this — it legitimately needs to
   * show a freshly-picked local data: URL before it's uploaded. Everywhere
   * else, avatarUrl comes from a saved profile, where a data: URL can only
   * mean a stale row from the since-fixed bug that saved the photo data
   * itself instead of uploading it — rejected outright rather than even
   * attempted, to stay consistent with mobile's image decoder, which can
   * choke on one of those without ever firing onError. */
  allowDataUrl?: boolean;
}) {
  const usableUrl = avatarUrl && (allowDataUrl || !avatarUrl.startsWith('data:')) ? avatarUrl : null;

  // The initials placeholder is always the base layer, with the photo
  // layered on top once it loads — rather than switching between the two on
  // error/success — so a broken/expired URL always leaves the initials
  // visible underneath instead of a fully transparent hole.
  return (
    <div
      className={outline ? 'avatar sk avatar-outline' : 'avatar sk'}
      style={{ width: size, height: size, fontSize, background: outline ? 'transparent' : 'var(--paper-2)', position: 'relative', overflow: 'hidden' }}
    >
      {/* Flat theme-gray fill (matches grid cells/story-peek elsewhere in the
          UI) instead of the old per-user pastel avatarColor, so the text can
          just use the normal theme ink color in both variants. */}
      <span style={{ color: 'var(--ink)' }}>{initial(nickname)}</span>
      {usableUrl ? (
        <img
          src={usableUrl}
          alt={nickname}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
    </div>
  );
}
