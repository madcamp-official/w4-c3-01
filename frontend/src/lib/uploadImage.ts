import { supabase } from '@/lib/supabaseClient';

const CHAT_IMAGE_BUCKET = 'chat-images';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Uploads a captured air-write PNG (data URL) to the chat-images bucket and returns its public URL. */
export async function uploadChatImage(userId: string, dataUrl: string): Promise<string> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요');
  const blob = dataUrlToBlob(dataUrl);
  const path = `${userId}/${Date.now()}.png`;
  const { error } = await supabase.storage.from(CHAT_IMAGE_BUCKET).upload(path, blob, {
    contentType: 'image/png',
    upsert: false
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(CHAT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
