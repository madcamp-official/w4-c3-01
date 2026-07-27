import type { AirDrawingDocument } from '@/features/air-drawing/types';

export interface StrokePoint {
  x: number;
  y: number;
  move: boolean;
}

export interface Comment {
  user: string;
  text: string;
}

export interface Post {
  id: string;
  username: string;
  avatarColor: string;
  time: string;
  image: string;
  strokes: StrokePoint[];
  drawing?: AirDrawingDocument;
  caption: string;
  liked: boolean;
  likes: number;
  comments: Comment[];
  mine: boolean;
}

export type MessageType = 'text' | 'air';

export interface ChatMessage {
  id: number;
  from: 'me' | 'them';
  type: MessageType;
  text?: string;
  image?: string;
  strokes?: StrokePoint[];
  time: string;
}

export interface Chat {
  id: string;
  name: string;
  color: string;
  messages: ChatMessage[];
}

export interface LoungeItem {
  image: string;
  strokes: StrokePoint[];
  x: number;
  y: number;
  scale: number;
  rotation: number;
  author: string;
}

export interface Lounge {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  items: LoungeItem[];
}

export interface SeedUser {
  nickname: string;
  color: string;
}

export interface UserSummary {
  id: string;
  username: string;
  nickname: string;
  avatarColor: string;
  avatarUrl: string | null;
}

export interface Session {
  id: string;
  isAuthenticated: boolean;
  username: string;
  nickname: string;
  avatarColor: string;
  heartUrl: string | null;
  avatarUrl: string | null;
  /** false면 (주로 Google 등 OAuth 첫 로그인) 아이디가 자동 생성된 상태 — 프로필 완성 화면으로 보냅니다. */
  onboarded: boolean;
}

export interface LoginPayload {
  /** Either the app username or the account email. */
  identifier: string;
  password: string;
}

export interface SignupPayload {
  username: string;
  email: string;
  nickname: string;
  password: string;
  heartUrl: string;
  avatarUrl: string | null;
}
