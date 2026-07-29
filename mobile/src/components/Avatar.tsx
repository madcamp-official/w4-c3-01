// Ported from frontend/src/components/Avatar.tsx — keep in sync (<img>/CSS -> RN Image/View).
import { Image, Text, View } from 'react-native';
import { useTheme } from '@/state/ThemeContext';

function initial(name: string): string {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

interface AvatarProps {
  nickname: string;
  color: string;
  size: number;
  fontSize: number;
  avatarUrl?: string | null;
  /** Plain outline circle with no color fill (matches week4_1's mypage avatar) instead of the usual colored-fill identity avatar. */
  outline?: boolean;
}

export default function Avatar({ nickname, color, size, fontSize, avatarUrl, outline }: AvatarProps) {
  const { colors } = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const base = {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: outline ? 2 : 1,
    borderColor: outline ? colors.ink : colors.border
  };
  if (avatarUrl) {
    return (
      <View style={[base, shape, { overflow: 'hidden' as const }]}>
        <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={[base, shape, { backgroundColor: outline ? 'transparent' : color }]}>
      {/* Fixed dark text on the colored-fill variant — that background is the
          user's own pastel avatarColor, not the app theme, so it shouldn't
          flip to white in dark mode (would vanish). Outline variant has no
          fill, so it uses the normal theme ink color instead. */}
      <Text style={{ fontSize, color: outline ? colors.ink : '#221F1A', fontWeight: '700' }}>{initial(nickname)}</Text>
    </View>
  );
}
