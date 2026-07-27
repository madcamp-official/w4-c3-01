import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Gaegu_400Regular, Gaegu_700Bold } from '@expo-google-fonts/gaegu';
import { NotoSansKR_400Regular, NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr';
import { ActivityIndicator, View } from 'react-native';
import { linking } from '@/navigation/linking';
import RootNavigator from '@/navigation/RootNavigator';
import { AppStateProvider } from '@/state/AppStateContext';
import { OverlayProvider } from '@/state/OverlayContext';
import { PlacementProvider } from '@/state/PlacementContext';
import { ToastProvider } from '@/state/ToastContext';
import { colors } from '@/theme/colors';

export default function App() {
  const [fontsLoaded] = useFonts({
    Gaegu_400Regular,
    Gaegu_700Bold,
    NotoSansKR_400Regular,
    NotoSansKR_700Bold
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <AppStateProvider>
            <OverlayProvider>
              <PlacementProvider>
                <NavigationContainer linking={linking}>
                  <RootNavigator />
                </NavigationContainer>
              </PlacementProvider>
            </OverlayProvider>
          </AppStateProvider>
        </ToastProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
