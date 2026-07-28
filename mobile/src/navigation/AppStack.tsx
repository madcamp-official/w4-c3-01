import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from '@/navigation/MainTabs';
import AirwriteScreen from '@/screens/AirwriteScreen';
import CameraScreen from '@/screens/CameraScreen';
import ChatListScreen from '@/screens/ChatListScreen';
import ChatThreadScreen from '@/screens/ChatThreadScreen';
import EditHeartScreen from '@/screens/EditHeartScreen';
import EditProfileScreen from '@/screens/EditProfileScreen';
import LoungeViewScreen from '@/screens/LoungeViewScreen';
import PreviewScreen from '@/screens/PreviewScreen';
import UserProfileScreen from '@/screens/UserProfileScreen';
import type { AppStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Preview" component={PreviewScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="Airwrite" component={AirwriteScreen} />
      <Stack.Screen name="EditHeart" component={EditHeartScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="LoungeView" component={LoungeViewScreen} />
    </Stack.Navigator>
  );
}
