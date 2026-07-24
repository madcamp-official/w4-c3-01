import { apiRequest } from '@/api/client';
import { mockStore } from '@/mock/store';
import type { Lounge, LoungeItem } from '@/types';

export async function fetchLounges(): Promise<Lounge[]> {
  try {
    return await apiRequest<Lounge[]>('/lounges');
  } catch {
    // TODO(backend): replace with GET /lounges
    mockStore.ensureSeeded();
    return mockStore.lounges;
  }
}

export async function placeLoungeItem(loungeId: string, item: LoungeItem): Promise<Lounge | undefined> {
  try {
    return await apiRequest<Lounge>(`/lounges/${loungeId}/items`, {
      method: 'POST',
      body: JSON.stringify(item)
    });
  } catch {
    // TODO(backend): replace with POST /lounges/:id/items
    return mockStore.addLoungeItem(loungeId, item);
  }
}
