// Lets components rendered outside the navigator tree (ShareSheet/LogoutSheet
// etc. — mounted as siblings of <NavigationContainer> in App.tsx, so they
// have no NavigationContext for useNavigation() to read) still trigger
// navigation. AppStackParamList's screen names are unique across the whole
// tree, so a plain untyped `navigate` here correctly bubbles down to
// whichever nested navigator actually owns that screen.
import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from '@/navigation/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const navigationRef = createNavigationContainerRef<any>();

export function navigateFromOutsideTree<RouteName extends keyof AppStackParamList>(
  name: RouteName,
  params: AppStackParamList[RouteName]
) {
  if (!navigationRef.isReady()) return;
  // @ts-expect-error — react-navigation's ref.navigate overloads don't
  // narrow well through a generic RouteName here; the call itself is sound.
  navigationRef.navigate(name, params);
}
