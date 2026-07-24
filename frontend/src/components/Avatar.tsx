function initial(name: string): string {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

export default function Avatar({
  nickname,
  color,
  size,
  fontSize
}: {
  nickname: string;
  color: string;
  size: number;
  fontSize: number;
}) {
  return (
    <div
      className="avatar sk"
      style={{ width: size, height: size, fontSize, background: color }}
    >
      {initial(nickname)}
    </div>
  );
}
