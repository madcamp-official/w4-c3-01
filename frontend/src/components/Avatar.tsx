function initial(name: string): string {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

export default function Avatar({
  nickname,
  size,
  fontSize,
  avatarUrl,
  outline
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
}) {
  if (avatarUrl) {
    // .sk's ::before border overlay doesn't render on <img> (a replaced element),
    // so the photo goes inside a plain wrapper that carries the sketchy border instead.
    return (
      <div className={outline ? 'avatar sk avatar-outline' : 'avatar sk'} style={{ width: size, height: size, overflow: 'hidden' }}>
        <img src={avatarUrl} alt={nickname} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  return (
    <div
      className={outline ? 'avatar sk avatar-outline' : 'avatar sk'}
      style={{ width: size, height: size, fontSize, background: outline ? 'transparent' : 'var(--paper-2)' }}
    >
      {/* Flat theme-gray fill (matches grid cells/story-peek elsewhere in the
          UI) instead of the old per-user pastel avatarColor, so the text can
          just use the normal theme ink color in both variants. */}
      <span style={{ color: 'var(--ink)' }}>{initial(nickname)}</span>
    </div>
  );
}
