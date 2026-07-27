// Ported from frontend/src/pages/SearchPage.tsx — keep in sync.
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Avatar from '@/components/Avatar';
import * as userApi from '@/api/userApi';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { colors, radius } from '@/theme/colors';
import { common } from '@/theme/common';
import type { UserSummary } from '@/types';

export default function SearchScreen() {
  const navigation = useNavigation();
  const { posts, session } = useAppState();
  const { openViewer } = useOverlay();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);

  const q = query.trim().toLowerCase();

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
      <Text style={[common.title, { marginBottom: 10 }]}>검색</Text>
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color={colors.inkSoft} />
        <TextInput
          style={styles.searchInput}
          placeholder="아이디 또는 닉네임으로 검색"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
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
                      <Avatar nickname={u.nickname} color={u.avatarColor} size={36} fontSize={14} avatarUrl={u.avatarUrl} />
                      <Text style={styles.userName}>{u.nickname}</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
              <Text style={[styles.sectionH, { marginTop: 14 }]}>게시물</Text>
              {results.length === 0 ? <Text style={common.subtitle}>검색 결과가 없어요</Text> : null}
            </>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.cell}
              onPress={() => openViewer({ image: item.image, caption: item.caption, strokes: item.strokes, postId: item.id })}
            >
              <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, backgroundColor: '#fff', marginBottom: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.ink },
  sectionH: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  userName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  cell: { flex: 1 / 3, aspectRatio: 1, margin: 2, backgroundColor: colors.paper2, borderRadius: radius.md, overflow: 'hidden' }
});
