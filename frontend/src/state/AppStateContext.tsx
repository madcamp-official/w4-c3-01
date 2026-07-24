import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '@/api/authApi';
import * as postsApi from '@/api/postsApi';
import * as chatApi from '@/api/chatApi';
import * as loungeApi from '@/api/loungeApi';
import * as userApi from '@/api/userApi';
import type {
  Chat,
  ChatMessage,
  Comment,
  Lounge,
  LoungeItem,
  LoginPayload,
  Post,
  Session,
  SignupPayload,
  StrokePoint
} from '@/types';

interface AppStateValue {
  session: Session | null;
  posts: Post[];
  chats: Chat[];
  lounges: Lounge[];

  loginUser: (payload: LoginPayload) => Promise<void>;
  signupUser: (payload: SignupPayload) => Promise<void>;
  logoutUser: () => void;
  setHeart: (heartUrl: string) => Promise<void>;

  loadFeed: () => Promise<void>;
  sharePost: (input: { image: string; strokes: StrokePoint[]; caption: string }) => Promise<Post>;
  likePost: (postId: string) => Promise<void>;
  commentOnPost: (postId: string, text: string) => Promise<void>;

  loadChats: () => Promise<void>;
  getChat: (chatId: string) => Chat | undefined;
  sendText: (chatId: string, text: string) => Promise<void>;
  sendAir: (chatId: string, image: string, strokes: StrokePoint[]) => Promise<void>;

  loadLounges: () => Promise<void>;
  getLounge: (loungeId: string) => Lounge | undefined;
  placeInLounge: (loungeId: string, item: LoungeItem) => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [lounges, setLounges] = useState<Lounge[]>([]);

  const loginUser = useCallback(async (payload: LoginPayload) => {
    const nextSession = await authApi.login(payload);
    setSession(nextSession);
  }, []);

  const signupUser = useCallback(async (payload: SignupPayload) => {
    const nextSession = await authApi.signup(payload);
    setSession(nextSession);
  }, []);

  const logoutUser = useCallback(() => {
    void authApi.logout();
    setSession(null);
    setPosts([]);
    setChats([]);
    setLounges([]);
  }, []);

  const setHeart = useCallback(async (heartUrl: string) => {
    await userApi.updateHeart(heartUrl);
    setSession((prev) => (prev ? { ...prev, heartUrl } : prev));
  }, []);

  const loadFeed = useCallback(async () => {
    setPosts(await postsApi.fetchFeed());
  }, []);

  const sharePost = useCallback(
    async (input: { image: string; strokes: StrokePoint[]; caption: string }) => {
      if (!session) throw new Error('not authenticated');
      const post = await postsApi.createPost({
        username: session.nickname,
        avatarColor: session.avatarColor,
        image: input.image,
        strokes: input.strokes,
        caption: input.caption
      });
      setPosts((prev) => [post, ...prev]);
      return post;
    },
    [session]
  );

  const likePost = useCallback(async (postId: string) => {
    const updated = await postsApi.toggleLike(postId);
    if (!updated) return;
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
  }, []);

  const commentOnPost = useCallback(
    async (postId: string, text: string) => {
      if (!session) return;
      const comment: Comment = { user: session.nickname, text };
      const updated = await postsApi.addComment(postId, comment);
      if (!updated) return;
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    },
    [session]
  );

  const loadChats = useCallback(async () => {
    setChats(await chatApi.fetchChats());
  }, []);

  const getChat = useCallback((chatId: string) => chats.find((c) => c.id === chatId), [chats]);

  const sendText = useCallback(async (chatId: string, text: string) => {
    const updated = await chatApi.sendTextMessage(chatId, text);
    if (!updated) return;
    setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
  }, []);

  const sendAir = useCallback(async (chatId: string, image: string, strokes: StrokePoint[]) => {
    const updated = await chatApi.sendAirMessage(chatId, image, strokes as ChatMessage['strokes']);
    if (!updated) return;
    setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
  }, []);

  const loadLounges = useCallback(async () => {
    setLounges(await loungeApi.fetchLounges());
  }, []);

  const getLounge = useCallback((loungeId: string) => lounges.find((l) => l.id === loungeId), [lounges]);

  const placeInLounge = useCallback(async (loungeId: string, item: LoungeItem) => {
    const updated = await loungeApi.placeLoungeItem(loungeId, item);
    if (!updated) return;
    setLounges((prev) => prev.map((l) => (l.id === loungeId ? updated : l)));
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      session,
      posts,
      chats,
      lounges,
      loginUser,
      signupUser,
      logoutUser,
      setHeart,
      loadFeed,
      sharePost,
      likePost,
      commentOnPost,
      loadChats,
      getChat,
      sendText,
      sendAir,
      loadLounges,
      getLounge,
      placeInLounge
    }),
    [
      session,
      posts,
      chats,
      lounges,
      loginUser,
      signupUser,
      logoutUser,
      setHeart,
      loadFeed,
      sharePost,
      likePost,
      commentOnPost,
      loadChats,
      getChat,
      sendText,
      sendAir,
      loadLounges,
      getLounge,
      placeInLounge
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
