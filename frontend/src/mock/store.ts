import { drawStrokesStatic, heartStrokeNormalized, randomScribble, renderStrokesToDataURL } from '@/lib/canvas';
import type { Chat, ChatMessage, Comment, Lounge, LoungeItem, Post, SeedUser } from '@/types';

export const AVATAR_TONES = ['#EAE2C9', '#F2ECDA', '#DCD3B0', '#E3D9BB', '#EFE7CE', '#D6CBA0'];

export const SEED_USERS: SeedUser[] = [
  { nickname: 'haeun_j', color: '#E3D9BB' },
  { nickname: 'minji.kim', color: '#DCD3B0' },
  { nickname: 'doyoon__', color: '#EFE7CE' }
];

function buildSeedPosts(): Post[] {
  const seedDefs = [
    { user: SEED_USERS[0], caption: '오늘 기분 ☀️ 그려봄', likes: 12 },
    { user: SEED_USERS[1], caption: '비 오는 날 낙서 하나', likes: 7 },
    { user: SEED_USERS[2], caption: '너한테 보내는 하트 💌', likes: 21 }
  ];
  return seedDefs.map((d, i) => {
    const strokes = randomScribble();
    return {
      id: 'seed-' + i,
      authorId: 'seed-user-' + i,
      username: d.user.nickname,
      avatarColor: d.user.color,
      avatarUrl: null,
      time: i + 1 + '시간 전',
      image: renderStrokesToDataURL(strokes, 400, 6),
      strokes,
      caption: d.caption,
      liked: false,
      likes: d.likes,
      comments: [{ user: SEED_USERS[(i + 1) % 3].nickname, text: '완전 예뻐요 ✨' }] as Comment[],
      mine: false
    };
  });
}

function buildSeedChats(): Chat[] {
  const heartMsgStrokes = heartStrokeNormalized();
  const heartMsgImg = renderStrokesToDataURL(heartMsgStrokes, 260, 6);
  return [
    {
      id: 'c1',
      name: SEED_USERS[0].nickname,
      color: SEED_USERS[0].color,
      avatarUrl: null,
      otherReadAt: null,
      messages: [
        { id: 1, from: 'them', type: 'text', text: '오늘 올린 낙서 완전 좋더라 ㅎㅎ', time: '오후 2:01', createdAt: new Date().toISOString() },
        { id: 2, from: 'me', type: 'text', text: '고마워 ㅋㅋ 손 가는대로 그려봤어', time: '오후 2:03', createdAt: new Date().toISOString() }
      ] as ChatMessage[]
    },
    {
      id: 'c2',
      name: SEED_USERS[2].nickname,
      color: SEED_USERS[2].color,
      avatarUrl: null,
      otherReadAt: null,
      messages: [
        { id: 1, from: 'them', type: 'air', image: heartMsgImg, strokes: heartMsgStrokes, time: '오전 11:40', createdAt: new Date().toISOString() },
        { id: 2, from: 'them', type: 'text', text: '허공에 써서 보냈어 💌', time: '오전 11:40', createdAt: new Date().toISOString() }
      ] as ChatMessage[]
    }
  ];
}

function buildSeedLounges(): Lounge[] {
  const makeItem = (user: SeedUser): LoungeItem => {
    const strokes = randomScribble();
    return {
      image: renderStrokesToDataURL(strokes, 220, 5),
      strokes,
      x: 0.2 + Math.random() * 0.5,
      y: 0.2 + Math.random() * 0.45,
      scale: 0.7 + Math.random() * 0.5,
      rotation: Math.round((Math.random() - 0.5) * 40),
      author: user.nickname
    };
  };
  return [
    { id: 'l1', name: '카페 온기', desc: '홍대 골목의 작은 카페', emoji: '☕', items: [makeItem(SEED_USERS[0]), makeItem(SEED_USERS[1])] },
    { id: 'l2', name: '학교 중앙광장', desc: '항상 사람이 많은 그 곳', emoji: '🏫', items: [makeItem(SEED_USERS[2])] },
    { id: 'l3', name: '우리집 앞 벽', desc: '내가 처음 연 라운지', emoji: '🧱', items: [] }
  ];
}

export function defaultHeartUrl(): string {
  const c = document.createElement('canvas');
  c.width = 220;
  c.height = 220;
  const ctx = c.getContext('2d')!;
  drawStrokesStatic(ctx, heartStrokeNormalized(), 220, 220, 8);
  return c.toDataURL('image/png');
}

/**
 * In-memory mock backend. Mirrors what a real API would persist, so the
 * src/api/* modules can fall back to it when no backend is configured.
 * State resets on page reload — this is a prototype data layer, not storage.
 */
class MockStore {
  posts: Post[] = [];
  chats: Chat[] = [];
  lounges: Lounge[] = [];
  seeded = false;

  ensureSeeded() {
    if (this.seeded) return;
    this.posts = buildSeedPosts();
    this.chats = buildSeedChats();
    this.lounges = buildSeedLounges();
    this.seeded = true;
  }

  reset() {
    this.seeded = false;
    this.ensureSeeded();
  }

  addPost(post: Post) {
    this.ensureSeeded();
    this.posts = [post, ...this.posts];
    return post;
  }

  toggleLike(postId: string): Post | undefined {
    this.ensureSeeded();
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return undefined;
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    return post;
  }

  addComment(postId: string, comment: Comment): Post | undefined {
    this.ensureSeeded();
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return undefined;
    post.comments = [...post.comments, comment];
    return post;
  }

  deletePost(postId: string) {
    this.ensureSeeded();
    this.posts = this.posts.filter((p) => p.id !== postId);
  }

  sendMessage(chatId: string, message: ChatMessage): Chat | undefined {
    this.ensureSeeded();
    const chat = this.chats.find((c) => c.id === chatId);
    if (!chat) return undefined;
    chat.messages = [...chat.messages, message];
    return chat;
  }

  addLoungeItem(loungeId: string, item: LoungeItem): Lounge | undefined {
    this.ensureSeeded();
    const lounge = this.lounges.find((l) => l.id === loungeId);
    if (!lounge) return undefined;
    lounge.items = [...lounge.items, item];
    return lounge;
  }
}

export const mockStore = new MockStore();
