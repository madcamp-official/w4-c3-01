// Ported from frontend/src/components/TopBar.tsx — keep in sync. Shared
// "ALine" wordmark + theme toggle + chat icon header, used by both the feed
// and my-page tabs so the same top region shows up consistently everywhere.
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Icon from '@/components/Icon';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';

export default function TopBar() {
  const navigation = useNavigation();
  const { chats, notifications } = useAppState();
  const hasUnreadChats = useMemo(() => chats.some((c) => c.unread), [chats]);
  const hasUnreadNotifications = useMemo(() => notifications.some((n) => !n.read), [notifications]);
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <View style={styles.dot} />
        <Text style={styles.logo}>ALine</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable style={styles.iconBtn} onPress={toggleTheme}>
          <Icon name={isDark ? 'sun' : 'moon'} size={19} color={colors.ink} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('Notifications')}
        >
          <Icon name="bell" size={20} color={colors.ink} />
          {hasUnreadNotifications ? <View style={styles.unreadDot} /> : null}
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('ChatList')}
        >
          <Icon name="send" size={20} color={colors.ink} />
          {hasUnreadChats ? <View style={styles.unreadDot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.accent },
    logo: { fontSize: 19, fontWeight: '800', color: colors.ink },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    unreadDot: {
      position: 'absolute',
      top: 3,
      right: 4,
      width: 11,
      height: 11,
      borderRadius: 5.5,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.paper
    }
  });
}
