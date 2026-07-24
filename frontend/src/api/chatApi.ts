import { apiRequest } from '@/api/client';
import { mockStore } from '@/mock/store';
import type { Chat, ChatMessage } from '@/types';

export async function fetchChats(): Promise<Chat[]> {
  try {
    return await apiRequest<Chat[]>('/chats');
  } catch {
    // TODO(backend): replace with GET /chats
    mockStore.ensureSeeded();
    return mockStore.chats;
  }
}

export async function sendTextMessage(chatId: string, text: string): Promise<Chat | undefined> {
  const message: ChatMessage = { id: Date.now(), from: 'me', type: 'text', text, time: '방금' };
  try {
    return await apiRequest<Chat>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message)
    });
  } catch {
    // TODO(backend): replace with POST /chats/:id/messages
    return mockStore.sendMessage(chatId, message);
  }
}

export async function sendAirMessage(chatId: string, image: string, strokes: ChatMessage['strokes']): Promise<Chat | undefined> {
  const message: ChatMessage = { id: Date.now(), from: 'me', type: 'air', image, strokes, time: '방금' };
  try {
    return await apiRequest<Chat>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message)
    });
  } catch {
    // TODO(backend): replace with POST /chats/:id/messages
    return mockStore.sendMessage(chatId, message);
  }
}
