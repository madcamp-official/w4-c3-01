// Ported from frontend/src/components/Avatar.tsx — keep in sync (<img>/CSS -> RN Image/View).
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

function initial(name: string): string {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

interface AvatarProps {
  nickname: string;
  color: string;
  size: number;
  fontSize: number;
  avatarUrl?: string | null;
}

export default function Avatar({ nickname, color, size, fontSize, avatarUrl }: AvatarProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (avatarUrl) {
    return (
      <View style={[styles.base, shape, { overflow: 'hidden' }]}>
        <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={[styles.base, shape, { backgroundColor: color }]}>
      <Text style={{ fontSize, color: colors.ink, fontWeight: '700' }}>{initial(nickname)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line
  }
});
