import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from '@/navigation/MainTabs';
import AirwriteScreen from '@/screens/AirwriteScreen';
import CameraScreen from '@/screens/CameraScreen';
import ChatListScreen from '@/screens/ChatListScreen';
import CommentScreen from '@/screens/CommentScreen';
import ChatThreadScreen from '@/screens/ChatThreadScreen';
import EditHeartScreen from '@/screens/EditHeartScreen';
import EditProfileScreen from '@/screens/EditProfileScreen';
import FollowListScreen from '@/screens/FollowListScreen';
import LoungeViewScreen from '@/screens/LoungeViewScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import PostDetailScreen from '@/screens/PostDetailScreen';
import PreviewScreen from '@/screens/PreviewScreen';
import SendToChatScreen from '@/screens/SendToChatScreen';
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
      <Stack.Screen name="FollowList" component={FollowListScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="SendToChat"
        component={SendToChatScreen}
        // Same reasoning as the Comment screen below: transparentModal +
        // 'fade' so only the sheet itself visibly slides, not the backdrop.
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
      <Stack.Screen name="LoungeView" component={LoungeViewScreen} />
      <Stack.Screen
        name="Comment"
        component={CommentScreen}
        // The screen itself only fades in — sliding the whole transparent
        // screen (dim backdrop included) up as one unit looked like a solid
        // black screen rising with the sheet. CommentScreen animates the
        // backdrop fade and sheet slide separately instead, so only the
        // sheet visibly moves.
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
