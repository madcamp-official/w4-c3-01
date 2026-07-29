// Ported from frontend/src/pages/SearchPage.tsx — keep in sync.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Avatar from '@/components/Avatar';
import Sketchy from '@/components/Sketchy';
import TopBar from '@/components/TopBar';
import * as userApi from '@/api/userApi';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';
import { radius } from '@/theme/colors';
import { buildCommon } from '@/theme/common';
import type { UserSummary } from '@/types';

export default function SearchScreen() {
  const navigation = useNavigation();
  const { posts, session, loadChats } = useAppState();
  const { colors } = useTheme();
  const common = buildCommon(colors);
  const styles = makeStyles(colors);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);

  const q = query.trim().toLowerCase();

  // Keeps TopBar's unread-chat dot fresh whenever this tab is shown.
  useFocusEffect(
    useCallback(() => {
      void loadChats();
    }, [loadChats])
  );

  useEffect(() => {
    if (!session || !q) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    userApi.searchUsers(query, session.id).then((result) => {
      if (!cancelled) setUsers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [query, q, session]);

  const results = useMemo(
    () => (q ? posts.filter((p) => p.caption.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)) : []),
    [posts, q]
  );

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={{ marginHorizontal: -20 }}>
        <TopBar />
      </View>
      <View style={styles.searchRow}>
        <Sketchy
          shape="blob"
          variant="a"
          color={colors.line}
          fill={colors.paper}
          shadow={{ dx: 1.5, dy: 2 }}
          strokeWidth={2}
          seed="search-box"
          style={styles.searchBox}
        >
          <Icon name="search" size={16} color={colors.inkSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="아이디 또는 닉네임으로 검색"
            placeholderTextColor={colors.inkSoft}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </Sketchy>
        <Pressable onPress={() => Keyboard.dismiss()} accessibilityLabel="검색">
          <Sketchy shape="round" radius={18} color={colors.line} strokeWidth={2} seed="search-submit" style={styles.searchSubmitBtn}>
            <Icon name="search" size={16} color={colors.ink} />
          </Sketchy>
        </Pressable>
      </View>
      {q ? (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          numColumns={3}
          ListHeaderComponent={
            <>
              {users.length ? (
                <>
                  <Text style={styles.sectionH}>사용자</Text>
                  {users.map((u) => (
                    <Pressable
                      key={u.id}
                      style={styles.userRow}
                      onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('UserProfile', { userId: u.id })}
                    >
                      <Avatar nickname={u.nickname} color={u.avatarColor} size={40} fontSize={14} avatarUrl={u.avatarUrl} />
                      <Text style={styles.userName}>{u.nickname}</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
              <Text style={[styles.sectionH, { marginTop: 16 }]}>게시물</Text>
              {results.length === 0 ? <Text style={[common.subtitle, { marginBottom: 0 }]}>검색 결과가 없어요</Text> : null}
            </>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.cell}
              onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('PostDetail', { postId: item.id })}
            >
              <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}

// See MyScreen.tsx's CELL_SIZE comment — same numColumns-grid fix.
const { width: SEARCH_SCREEN_WIDTH } = Dimensions.get('window');
const SEARCH_CELL_SIZE = (SEARCH_SCREEN_WIDTH - 40 - 2 * 2 * 3) / 3;

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    searchBox: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.ink },
    searchSubmitBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    sectionH: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, marginBottom: 10 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    userName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    cell: { width: SEARCH_CELL_SIZE, aspectRatio: 1, margin: 2, backgroundColor: colors.paper2, borderRadius: radius.md, overflow: 'hidden' }
  });
}
