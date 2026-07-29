import type { AirDrawingDocument } from '@/features/air-drawing/types';

export interface StrokePoint {
  x: number;
  y: number;
  move: boolean;
}

export interface Comment {
  id: number;
  authorId: string;
  user: string;
  text: string;
  avatarColor?: string;
  avatarUrl?: string | null;
}

export interface Post {
  id: string;
  authorId: string;
  username: string;
  avatarColor: string;
  avatarUrl: string | null;
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

export type MessageType = 'text' | 'air' | 'post';

export interface ChatMessage {
  id: number;
  from: 'me' | 'them';
  type: MessageType;
  text?: string;
  image?: string;
  strokes?: StrokePoint[];
  /** type: 'post'일 때만 — 원본 게시물 id (게시물이 삭제됐으면 null이 됩니다). */
  postId?: string | null;
  time: string;
  /** ISO timestamp — 날짜 구분선/읽음 계산용. time은 화면에 보여주는 포맷된 문자열입니다. */
  createdAt: string;
}

export interface Chat {
  id: string;
  name: string;
  color: string;
  avatarUrl: string | null;
  messages: ChatMessage[];
  /** 상대방이 마지막으로 읽은 시각(ISO). 이 시각 이전에 내가 보낸 메시지는 "읽음"으로 표시합니다. */
  otherReadAt: string | null;
  /** 마지막 메시지가 상대방이 보낸 것이고 아직 내가 안 읽었으면 true. */
  unread: boolean;
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
