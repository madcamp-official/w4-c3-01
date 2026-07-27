// Ported from frontend/src/pages/FeedPage.tsx — keep in sync.
import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import PostCard from '@/components/PostCard';
import type { AppStackParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { colors } from '@/theme/colors';

export default function FeedScreen() {
  const { posts, loadFeed } = useAppState();
  const navigation = useNavigation();

  useEffect(() => {
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.dot} />
          <Text style={styles.logo}>손끝</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => navigation.getParent<NavigationProp<AppStackParamList>>()?.navigate('ChatList')}>
          <Feather name="send" size={20} color={colors.ink} />
        </Pressable>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  logo: { fontSize: 19, fontWeight: '800', color: colors.ink },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }
});
