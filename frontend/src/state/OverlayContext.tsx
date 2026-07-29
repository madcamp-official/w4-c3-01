import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ChatMessage, StrokePoint } from '@/types';

interface ViewerPayload {
  image: string;
  caption: string;
  strokes?: StrokePoint[];
}

interface OverlayValue {
  viewer: ViewerPayload | null;
  openViewer: (payload: ViewerPayload) => void;
  openViewerForMessage: (msg: Pick<ChatMessage, 'image' | 'strokes'>) => void;
  closeViewer: () => void;

  commentPostId: string | null;
  openComments: (postId: string) => void;
  closeComments: () => void;

  sharePostId: string | null;
  openShare: (postId: string) => void;
  closeShare: () => void;

  sendToChatPostId: string | null;
  openSendToChat: (postId: string) => void;
  closeSendToChat: () => void;

  logoutOpen: boolean;
  openLogout: () => void;
  closeLogout: () => void;
}

const OverlayContext = createContext<OverlayValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerPayload | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [sendToChatPostId, setSendToChatPostId] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const value = useMemo<OverlayValue>(
    () => ({
      viewer,
      openViewer: (payload) => setViewer(payload),
      openViewerForMessage: (msg) =>
        setViewer({ image: msg.image ?? '', caption: '허공에 쓴 손글씨 메시지', strokes: msg.strokes }),
      closeViewer: () => setViewer(null),

      commentPostId,
      openComments: (postId) => setCommentPostId(postId),
      closeComments: () => setCommentPostId(null),

      sharePostId,
      openShare: (postId) => setSharePostId(postId),
      closeShare: () => setSharePostId(null),

      sendToChatPostId,
      openSendToChat: (postId) => setSendToChatPostId(postId),
      closeSendToChat: () => setSendToChatPostId(null),

      logoutOpen,
      openLogout: () => setLogoutOpen(true),
      closeLogout: () => setLogoutOpen(false)
    }),
    [viewer, commentPostId, sharePostId, sendToChatPostId, logoutOpen]
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlay(): OverlayValue {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within OverlayProvider');
  return ctx;
}
