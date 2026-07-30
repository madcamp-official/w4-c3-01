// Ported from frontend/src/components/Avatar.tsx — keep in sync (<img>/CSS -> RN Image/View).
import { Image, StyleSheet, Text, View } from 'react-native';
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
  /** AvatarPicker's own live preview passes this — it legitimately needs to
   * show a freshly-picked local data: URL before it's uploaded. Everywhere
   * else, avatarUrl comes from a saved profile, where a data: URL can only
   * mean a stale row from the since-fixed bug that saved the photo data
   * itself instead of uploading it — rejected outright rather than even
   * attempted, since the native image decoder can choke on one of those
   * without ever firing onError. */
  allowDataUrl?: boolean;
}

export default function Avatar({ nickname, size, fontSize, avatarUrl, allowDataUrl }: AvatarProps) {
  const { colors } = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const usableUrl = avatarUrl && (allowDataUrl || !avatarUrl.startsWith('data:')) ? avatarUrl : null;

  // The initials placeholder is always the base layer, with the photo
  // layered on top once it loads — rather than switching between the two on
  // error/success. A broken/expired URL, or one that (for reasons we
  // couldn't pin down — seen specifically inside the feed's animated story
  // card, not the plain list view using this same component) never fires
  // either onLoad or onError on some devices, both used to leave a fully
  // transparent hole with nothing behind it. This way there's always
  // something underneath regardless of what the Image does.
  return (
    <View style={[shape, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' as const, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper2 }]}>
      {/* Flat theme-gray fill (matches grid cells elsewhere in the UI)
          instead of the old per-user pastel avatarColor, so the text can
          just use the normal theme ink color in both variants. */}
      <Text style={{ fontSize, color: colors.ink, fontWeight: '700' }}>{initial(nickname)}</Text>
      {usableUrl ? (
        <Image source={{ uri: usableUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
    </View>
  );
}
