import { NativeModules, Platform } from 'react-native';
import type { Post } from '@/types';

type ALineWidgetModule = {
  updateLatestPost(imageUrl: string, author: string, time: string): Promise<void>;
  clear(): Promise<void>;
};

const nativeWidget = NativeModules.ALineWidget as ALineWidgetModule | undefined;

export async function updateLatestPostWidget(post: Post | undefined): Promise<void> {
  if (Platform.OS !== 'android' || !nativeWidget) return;

  try {
    if (!post) {
      await nativeWidget.clear();
      return;
    }
    await nativeWidget.updateLatestPost(post.image, post.username, post.time);
  } catch (error) {
    if (__DEV__) console.warn('Android widget update failed', error);
  }
}

export async function clearLatestPostWidget(): Promise<void> {
  if (Platform.OS !== 'android' || !nativeWidget) return;
  try {
    await nativeWidget.clear();
  } catch (error) {
    if (__DEV__) console.warn('Android widget clear failed', error);
  }
}
