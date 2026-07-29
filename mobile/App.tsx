import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Gaegu_400Regular, Gaegu_700Bold } from '@expo-google-fonts/gaegu';
import { NotoSansKR_400Regular, NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr';
import { ActivityIndicator, View } from 'react-native';
import CommentSheet from '@/components/CommentSheet';
import LogoutSheet from '@/components/LogoutSheet';
import ShareSheet from '@/components/ShareSheet';
import Toast from '@/components/Toast';
import ViewerOverlay from '@/components/ViewerOverlay';
import { linking } from '@/navigation/linking';
import RootNavigator from '@/navigation/RootNavigator';
import { AppStateProvider } from '@/state/AppStateContext';
import { OverlayProvider } from '@/state/OverlayContext';
import { PlacementProvider } from '@/state/PlacementContext';
import { ThemeProvider, useTheme } from '@/state/ThemeContext';
import { ToastProvider } from '@/state/ToastContext';
import { colors } from '@/theme/colors';

function AppContent() {
  const { isDark } = useTheme();
  return (
    <ToastProvider>
      <AppStateProvider>
        <OverlayProvider>
          <PlacementProvider>
            <NavigationContainer linking={linking}>
              <RootNavigator />
            </NavigationContainer>
            <ViewerOverlay />
            <CommentSheet />
            <ShareSheet />
            <LogoutSheet />
            <Toast />
          </PlacementProvider>
        </OverlayProvider>
      </AppStateProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ToastProvider>
  );
}

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
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
