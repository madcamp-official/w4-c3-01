// Replaces frontend/src/types-nav.ts (location.state -> React Navigation route params).
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
  MainTabs: undefined;
  Camera: { intent?: CaptureIntent } | undefined;
  Preview: { image: string; strokes: StrokePoint[]; drawing?: AirDrawingDocument; intent: CaptureIntent };
  ChatList: undefined;
  ChatThread: { chatId: string };
  Airwrite: { chatId: string };
  EditHeart: undefined;
  EditProfile: undefined;
  UserProfile: { userId: string };
  LoungeView: { loungeId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  CompleteProfile: undefined;
  App: undefined;
};
