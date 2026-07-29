function initial(name: string): string {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

export default function Avatar({
  nickname,
  color,
  size,
  fontSize,
  avatarUrl,
  outline
}: {
  nickname: string;
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
      style={{ width: size, height: size, fontSize, background: outline ? 'transparent' : color }}
    >
      {/* Fixed dark text on the colored-fill variant — that background is the
          user's own pastel avatarColor, not the app theme, so it shouldn't
          flip to white in dark mode (would vanish). Outline variant has no
          fill, so it uses the normal theme ink color instead. */}
      <span style={{ color: outline ? 'var(--ink)' : '#221F1A' }}>{initial(nickname)}</span>
    </div>
  );
}
