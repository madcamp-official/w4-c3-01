// Ported from frontend/src/components/BottomNav.tsx — keep in sync.
// A custom tabBar (instead of the default) so the middle "camera" button can
// push onto the parent AppStack (it's not a tab with its own content) and so
// tapping the already-active My tab opens the logout sheet, matching the web
// version's exact behavior.
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Icon, { type IconName } from '@/components/Icon';
import Sketchy from '@/components/Sketchy';
import SketchyLine from '@/components/SketchyLine';
import FeedScreen from '@/screens/FeedScreen';
import LoungeListScreen from '@/screens/LoungeListScreen';
import SearchScreen from '@/screens/SearchScreen';
import MyScreen from '@/screens/MyScreen';
import { useBottomInset } from '@/lib/useBottomInset';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { useAppState } from '@/state/AppStateContext';
import { useOverlay } from '@/state/OverlayContext';
import { useTheme } from '@/state/ThemeContext';
import type { NavigationProp } from '@react-navigation/native';

const Tab = createBottomTabNavigator<TabParamList>();

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { session } = useAppState();
  const { openLogout } = useOverlay();
  const { colors, isDark } = useTheme();
  const bottomInset = useBottomInset();
  const styles = makeStyles(colors);
  const parentNav = navigation.getParent<NavigationProp<AppStackParamList>>();

  const icons: Record<keyof TabParamList, IconName> = {
    Feed: 'home',
    Lounges: 'map-pin',
    Search: 'search',
    My: 'heart'
  };

  return (
    // useBottomInset() (not a SafeAreaView edge) so the bar's reserved height
    // is computed synchronously and floors to a real clearance value even on
    // Android builds where the reported inset comes back as 0/too-small
    // despite an actual nav bar being present.
    <View style={[styles.bar, { paddingBottom: bottomInset }]}>
      <SketchyLine seed="main-tabs-top" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      {state.routes.slice(0, 2).map((route, i) => {
        const focused = state.index === i;
        return (
          <Pressable key={route.key} style={styles.btn} onPress={() => navigation.navigate(route.name)}>
            <Icon name={icons[route.name as keyof TabParamList]} size={22} color={focused ? colors.ink : colors.muted} />
          </Pressable>
        );
      })}

      <Pressable onPress={() => parentNav?.navigate('Camera', { intent: { kind: 'post' } })} accessibilityLabel="촬영">
        <Sketchy radius={24} color={colors.paper} seed="main-tabs-plus" style={styles.plusBtn}>
          <Icon name="edit-2" size={20} color={colors.paper} />
        </Sketchy>
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
              // Dark ink on transparent — tint white in dark mode so it stays visible.
              <Image
                source={{ uri: session.heartUrl }}
                style={{ width: 22, height: 22, tintColor: isDark ? '#fff' : undefined }}
                resizeMode="contain"
              />
            ) : (
              <Icon name={icons[route.name as keyof TabParamList]} size={22} color={focused ? colors.ink : colors.muted} />
            )}
          </Pressable>
        );
      })}
    </View>
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

function makeStyles(colors: import('@/theme/colors').ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: colors.paper,
      minHeight: 62,
      paddingTop: 10,
      position: 'relative'
    },
    btn: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
    plusBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
      marginTop: -12
    }
  });
}
