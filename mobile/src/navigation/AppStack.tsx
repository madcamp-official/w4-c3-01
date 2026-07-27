// Phase 1 스코프: MainTabs(피드 스텁)만 연결. Camera/Preview/Chat/Lounge 등
// 나머지 화면은 Phase 2~5에서 채워집니다 (plan 참고).
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeedScreen from '@/screens/FeedScreen';
import type { AppStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* TODO(Phase 2): MainTabs 탭 네비게이터로 교체 */}
      <Stack.Screen name="MainTabs" component={FeedScreen} />
    </Stack.Navigator>
  );
}
