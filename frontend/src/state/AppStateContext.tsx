import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  /** True while the initial Supabase session restore (on page load) is in flight. */
  sessionLoading: boolean;
  posts: Post[];
  chats: Chat[];
  lounges: Lounge[];

  loginUser: (payload: LoginPayload) => Promise<void>;
  signupUser: (payload: SignupPayload) => Promise<void>;
  logoutUser: () => void;
  setHeart: (heartUrl: string) => Promise<void>;
  setAvatar: (avatarUrl: string) => Promise<void>;
  updateProfile: (updates: { username: string; nickname: string }) => Promise<void>;

  loadFeed: () => Promise<void>;
  sharePost: (input: { image: string; strokes: StrokePoint[]; caption: string }) => Promise<Post>;
  likePost: (postId: string) => Promise<void>;
  commentOnPost: (postId: string, text: string) => Promise<void>;

  loadChats: () => Promise<void>;
  loadThread: (chatId: string) => Promise<void>;
  getChat: (chatId: string) => Chat | undefined;
  sendText: (chatId: string, text: string) => Promise<void>;
  sendAir: (chatId: string, image: string, strokes: StrokePoint[]) => Promise<void>;
  startConversationWith: (otherUserId: string) => Promise<string | null>;
  subscribeToThread: (chatId: string) => () => void;

  loadLounges: () => Promise<void>;
  getLounge: (loungeId: string) => Lounge | undefined;
  placeInLounge: (loungeId: string, item: LoungeItem) => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [lounges, setLounges] = useState<Lounge[]>([]);

  useEffect(() => {
    let cancelled = false;
    authApi.restoreSession().then((restored) => {
      if (!cancelled) {
        setSession(restored);
        setSessionLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const setHeart = useCallback(
    async (heartUrl: string) => {
      if (!session) return;
      await userApi.updateHeart(session.id, heartUrl);
      setSession((prev) => (prev ? { ...prev, heartUrl } : prev));
    },
    [session]
  );

  const setAvatar = useCallback(
    async (avatarUrl: string) => {
      if (!session) return;
      await userApi.updateAvatar(session.id, avatarUrl);
      setSession((prev) => (prev ? { ...prev, avatarUrl } : prev));
    },
    [session]
  );

  const updateProfile = useCallback(
    async (updates: { username: string; nickname: string }) => {
      if (!session) return;
      await userApi.updateProfile(session.id, updates);
      setSession((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    [session]
  );

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
    if (!session) return;
    setChats(await chatApi.fetchConversations(session.id));
  }, [session]);

  const loadThread = useCallback(
    async (chatId: string) => {
      if (!session) return;
      const thread = await chatApi.fetchThread(chatId, session.id);
      if (!thread) return;
      setChats((prev) => (prev.some((c) => c.id === chatId) ? prev.map((c) => (c.id === chatId ? thread : c)) : [thread, ...prev]));
    },
    [session]
  );

  const getChat = useCallback((chatId: string) => chats.find((c) => c.id === chatId), [chats]);

  const receiveMessage = useCallback((chatId: string, message: ChatMessage) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        if (c.messages.some((m) => m.id === message.id)) return c; // 내가 보낸 메시지는 이미 반영돼 있어 중복 방지
        return { ...c, messages: [...c.messages, message] };
      })
    );
  }, []);

  const sendText = useCallback(
    async (chatId: string, text: string) => {
      if (!session) return;
      const message = await chatApi.sendTextMessage(chatId, session.id, text);
      if (message) receiveMessage(chatId, message);
    },
    [session, receiveMessage]
  );

  const sendAir = useCallback(
    async (chatId: string, image: string, strokes: StrokePoint[]) => {
      if (!session) return;
      const message = await chatApi.sendAirMessage(chatId, session.id, image, strokes);
      if (message) receiveMessage(chatId, message);
    },
    [session, receiveMessage]
  );

  const startConversationWith = useCallback(
    async (otherUserId: string) => {
      if (!session) return null;
      return chatApi.findOrCreateConversation(session.id, otherUserId);
    },
    [session]
  );

  const subscribeToThread = useCallback(
    (chatId: string) => {
      if (!session) return () => {};
      return chatApi.subscribeToThread(chatId, session.id, (message) => receiveMessage(chatId, message));
    },
    [session, receiveMessage]
  );

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
      sessionLoading,
      posts,
      chats,
      lounges,
      loginUser,
      signupUser,
      logoutUser,
      setHeart,
      setAvatar,
      updateProfile,
      loadFeed,
      sharePost,
      likePost,
      commentOnPost,
      loadChats,
      loadThread,
      getChat,
      sendText,
      sendAir,
      startConversationWith,
      subscribeToThread,
      loadLounges,
      getLounge,
      placeInLounge
    }),
    [
      session,
      sessionLoading,
      posts,
      chats,
      lounges,
      loginUser,
      signupUser,
      logoutUser,
      setHeart,
      setAvatar,
      updateProfile,
      loadFeed,
      sharePost,
      likePost,
      commentOnPost,
      loadChats,
      loadThread,
      getChat,
      sendText,
      sendAir,
      startConversationWith,
      subscribeToThread,
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
