import { apiRequest } from '@/api/client';

export async function updateHeart(heartUrl: string): Promise<{ heartUrl: string }> {
  try {
    return await apiRequest<{ heartUrl: string }>('/me/heart', {
      method: 'PUT',
      body: JSON.stringify({ heartUrl })
    });
  } catch {
    // TODO(backend): replace with PUT /me/heart
    return { heartUrl };
  }
}
