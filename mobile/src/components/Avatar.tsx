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
}

export default function Avatar({ nickname, size, fontSize, avatarUrl }: AvatarProps) {
  const { colors } = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (avatarUrl) {
    return (
      <View style={[shape, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' as const }]}>
        <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={[shape, { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper2 }]}>
      {/* Flat theme-gray fill (matches grid cells elsewhere in the UI)
          instead of the old per-user pastel avatarColor, so the text can
          just use the normal theme ink color in both variants. */}
      <Text style={{ fontSize, color: colors.ink, fontWeight: '700' }}>{initial(nickname)}</Text>
    </View>
  );
}
