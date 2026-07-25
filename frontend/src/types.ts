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
}

export interface Session {
  id: string;
  isAuthenticated: boolean;
  username: string;
  nickname: string;
  avatarColor: string;
  heartUrl: string | null;
  followers: number;
  following: number;
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
}
