import { useRef, type ChangeEvent } from 'react';
import Avatar from '@/components/Avatar';
import { fileToResizedDataUrl } from '@/lib/imageFile';
import { useToast } from '@/state/ToastContext';

interface AvatarPickerProps {
  dataUrl: string | null;
  nickname: string;
  color: string;
  size?: number;
  onChange: (dataUrl: string) => void;
}

export default function AvatarPicker({ dataUrl, nickname, color, size = 96, onChange }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await fileToResizedDataUrl(file));
    } catch (err) {
      showToast(err instanceof Error ? err.message : '사진을 불러오지 못했어요');
    }
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <Avatar nickname={nickname} color={color} size={size} fontSize={size * 0.36} avatarUrl={dataUrl} />
      <button
        type="button"
        className="icon-btn sk"
        style={{ position: 'absolute', right: -4, bottom: -4, width: 30, height: 30 }}
        onClick={() => inputRef.current?.click()}
        aria-label="프로필 사진 선택"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
}
