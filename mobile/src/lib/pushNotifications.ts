// Requests notification permission, sets up the Android channel, and
// registers this device's Expo push token — call once per login. See
// https://docs.expo.dev/versions/v57.0.0/sdk/notifications/ for the SDK 57 API.
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as notificationsApi from '@/api/notificationsApi';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ALine 알림',
      importance: Notifications.AndroidImportance.MAX
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (status !== 'granted') {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await notificationsApi.registerPushToken(userId, token);
}
