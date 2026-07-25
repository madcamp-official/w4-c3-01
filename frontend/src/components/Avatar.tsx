function initial(name: string): string {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

export default function Avatar({
  nickname,
  color,
  size,
  fontSize,
  avatarUrl
}: {
  nickname: string;
  color: string;
  size: number;
  fontSize: number;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    // .sk's ::before border overlay doesn't render on <img> (a replaced element),
    // so the photo goes inside a plain wrapper that carries the sketchy border instead.
    return (
      <div className="avatar sk" style={{ width: size, height: size, overflow: 'hidden' }}>
        <img src={avatarUrl} alt={nickname} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  return (
    <div className="avatar sk" style={{ width: size, height: size, fontSize, background: color }}>
      {initial(nickname)}
    </div>
  );
}
