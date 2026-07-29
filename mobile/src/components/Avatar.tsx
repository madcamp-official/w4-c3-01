// Ported from frontend/src/components/Avatar.tsx — keep in sync (<img>/CSS -> RN Image/View).
import { Image, Text, View } from 'react-native';
import { useTheme } from '@/state/ThemeContext';

function initial(name: string): string {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

interface AvatarProps {
  nickname: string;
  /** No longer drives the no-photo fallback background (now a flat theme
   * gray, see below) — kept required so call sites don't need to change. */
  color: string;
  size: number;
  fontSize: number;
  avatarUrl?: string | null;
  /** Plain outline circle with no color fill (matches week4_1's mypage avatar) instead of the usual colored-fill identity avatar. */
  outline?: boolean;
}

export default function Avatar({ nickname, size, fontSize, avatarUrl, outline }: AvatarProps) {
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
    <View style={[base, shape, { backgroundColor: outline ? 'transparent' : colors.paper2 }]}>
      {/* Flat theme-gray fill (matches grid cells elsewhere in the UI)
          instead of the old per-user pastel avatarColor, so the text can
          just use the normal theme ink color in both variants. */}
      <Text style={{ fontSize, color: colors.ink, fontWeight: '700' }}>{initial(nickname)}</Text>
    </View>
  );
}
