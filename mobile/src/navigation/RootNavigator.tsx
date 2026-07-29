// Ported from frontend/src/components/ProtectedLayout.tsx + PublicOnlyLayout.tsx —
// same three-way branch, now as a conditional navigator tree instead of route guards.
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AppStack from '@/navigation/AppStack';
import AuthStack from '@/navigation/AuthStack';
import CompleteProfileScreen from '@/screens/CompleteProfileScreen';
import { useAppState } from '@/state/AppStateContext';
import { useTheme } from '@/state/ThemeContext';

export default function RootNavigator() {
  const { session, sessionLoading, loadFeed, loadChats, loadLounges } = useAppState();
  const { colors } = useTheme();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!session || bootstrapped.current) return;
    bootstrapped.current = true;
    void loadFeed();
    void loadChats();
    void loadLounges();
  }, [session, loadFeed, loadChats, loadLounges]);

  if (sessionLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (!session) return <AuthStack />;
  if (!session.onboarded) return <CompleteProfileScreen />;
  return <AppStack />;
}
