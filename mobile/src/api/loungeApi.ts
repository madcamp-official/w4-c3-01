// Adapted from frontend/src/api/loungeApi.ts — keep in sync.
// The original had a fetch() attempt against api/client.ts's VITE_API_BASE_URL,
// but that custom REST backend was never actually used (always empty in .env),
// so it's dropped here and this goes straight to the mock store, same as the
// effective behavior today. Supabase-backed lounges are a later migration
// (see README "알려진 제약" / plan Phase 5).
import { mockStore } from '@/mock/store';
import type { Lounge, LoungeItem } from '@/types';

export async function fetchLounges(): Promise<Lounge[]> {
  mockStore.ensureSeeded();
  return mockStore.lounges;
}

export async function placeLoungeItem(loungeId: string, item: LoungeItem): Promise<Lounge | undefined> {
  return mockStore.addLoungeItem(loungeId, item);
}
