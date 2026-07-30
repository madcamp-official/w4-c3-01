// Replaces frontend/src/types-nav.ts (location.state -> React Navigation route params).
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AirDrawingDocument } from '@/air-drawing-types';
import type { StrokePoint } from '@/types';

export type CaptureIntent = { kind: 'post' } | { kind: 'lounge'; loungeId: string };

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Onboarding: undefined;
};

export type TabParamList = {
  Feed: undefined;
  Lounges: undefined;
  Search: undefined;
  My: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  Camera: { intent?: CaptureIntent; source?: 'widget' } | undefined;
  Preview: {
    image: string;
    strokes: StrokePoint[];
    drawing?: AirDrawingDocument;
    intent: CaptureIntent;
    /** Set when reached from a post's "수정하기" menu item instead of a fresh
     * capture — the screen reuses the same layout, but saves a caption edit
     * to the existing post instead of creating a new one. */
    editPostId?: string;
    caption?: string;
  };
  ChatList: undefined;
  ChatThread: { chatId: string };
  Airwrite: { chatId: string };
  EditHeart: undefined;
  EditProfile: undefined;
  UserProfile: { userId: string };
  FollowList: { userId: string; mode: 'followers' | 'following' };
  LoungeView: { loungeId: string };
  Comment: { postId: string };
  SendToChat: { postId: string };
  PostDetail: { postId: string };
  Notifications: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  CompleteProfile: undefined;
  App: undefined;
};
