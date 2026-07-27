// Ported from frontend/src/components/AvatarPicker.tsx — keep in sync (<input type=file> -> expo-image-picker).
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Avatar from '@/components/Avatar';
import { pickAvatarDataUrl } from '@/lib/imagePicker';
import { useToast } from '@/state/ToastContext';
import { colors } from '@/theme/colors';

interface AvatarPickerProps {
  dataUrl: string | null;
  nickname: string;
  color: string;
  size?: number;
  onChange: (dataUrl: string) => void;
}

export default function AvatarPicker({ dataUrl, nickname, color, size = 96, onChange }: AvatarPickerProps) {
  const { showToast } = useToast();

  async function handlePress() {
    try {
      const picked = await pickAvatarDataUrl();
      if (picked) onChange(picked);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '사진을 불러오지 못했어요');
    }
  }

  return (
    <View style={{ width: size, height: size }}>
      <Avatar nickname={nickname} color={color} size={size} fontSize={size * 0.36} avatarUrl={dataUrl} />
      <Pressable style={styles.editBtn} onPress={handlePress}>
        <Feather name="edit-2" size={14} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
