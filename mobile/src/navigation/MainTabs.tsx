// Ported from frontend/src/components/BottomNav.tsx — keep in sync.
// A custom tabBar (instead of the default) so the middle "camera" button can
// push onto the parent AppStack (it's not a tab with its own content) and so
// tapping the already-active My tab opens the logout sheet, matching the web
// version's exact behavior.
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import FeedScreen from '@/screens/FeedScreen';
import LoungeListScreen from '@/screens/LoungeListScreen';
import SearchScreen from '@/screens/SearchScreen';
import MyScreen from '@/screens/MyScreen';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { colors } from '@/theme/colors';
import type { NavigationProp } from '@react-navigation/native';

const Tab = createBottomTabNavigator<TabParamList>();

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { session } = useAppState();
  const { openLogout } = useOverlay();
  const parentNav = navigation.getParent<NavigationProp<AppStackParamList>>();

  const icons: Record<keyof TabParamList, keyof typeof Feather.glyphMap> = {
    Feed: 'home',
    Lounges: 'map-pin',
    Search: 'search',
    My: 'user'
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      {state.routes.slice(0, 2).map((route, i) => {
        const focused = state.index === i;
        return (
          <Pressable key={route.key} style={styles.btn} onPress={() => navigation.navigate(route.name)}>
            <Feather name={icons[route.name as keyof TabParamList]} size={22} color={focused ? colors.ink : colors.inkSoft} />
          </Pressable>
        );
      })}

      <Pressable style={styles.plusBtn} onPress={() => parentNav?.navigate('Camera', { intent: { kind: 'post' } })} accessibilityLabel="촬영">
        <Feather name="edit-2" size={20} color={colors.paper} />
      </Pressable>

      {state.routes.slice(2).map((route, idx) => {
        const i = idx + 2;
        const focused = state.index === i;
        const isMy = route.name === 'My';
        return (
          <Pressable
            key={route.key}
            style={styles.btn}
            onPress={() => (isMy && focused ? openLogout() : navigation.navigate(route.name))}
          >
            {isMy && session?.heartUrl ? (
              <Image source={{ uri: session.heartUrl }} style={{ width: 22, height: 22 }} resizeMode="contain" />
            ) : (
              <Feather name={icons[route.name as keyof TabParamList]} size={22} color={focused ? colors.ink : colors.inkSoft} />
            )}
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Lounges" component={LoungeListScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="My" component={MyScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 6
  },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  plusBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    marginTop: -14
  }
});
