// Placeholder for Phase 5 — full lounge list (with QR-scan simulation) comes then.
// Exists now so MainTabs has something to route to in Phase 2.
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { common } from '@/theme/common';

export default function LoungeListScreen() {
  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={common.title}>라운지</Text>
        <Text style={common.subtitle}>Phase 5에서 구현됩니다.</Text>
      </View>
    </SafeAreaView>
  );
}
