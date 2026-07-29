import { useRef, type ChangeEvent } from 'react';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { fileToResizedDataUrl } from '@/lib/imageFile';
import { useToast } from '@/state/ToastContext';

interface AvatarPickerProps {
  dataUrl: string | null;
  nickname: string;
  color: string;
  size?: number;
  onChange: (dataUrl: string) => void;
  /** Plain ink-outline avatar (matches week4_1's edit-profile avatar) instead of the colored-fill identity avatar. */
  outline?: boolean;
}

export default function AvatarPicker({ dataUrl, nickname, color, size = 96, onChange, outline }: AvatarPickerProps) {
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
      <Avatar nickname={nickname} color={color} size={size} fontSize={size * 0.36} avatarUrl={dataUrl} outline={outline} />
      <button
        type="button"
        className="icon-btn"
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: 30,
          height: 30,
          background: 'var(--ink)',
          border: '2px solid var(--paper)'
        }}
        onClick={() => inputRef.current?.click()}
        aria-label="프로필 사진 선택"
      >
        <Icon name="edit-2" size={14} style={{ color: 'var(--paper)' }} />
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
}
