import { supabase } from '@/lib/supabaseClient';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Uploads a captured PNG (data URL) to the given public bucket, under the uploader's own uid folder, and returns its public URL. */
async function uploadImageToBucket(bucket: string, userId: string, dataUrl: string): Promise<string> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요');
  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    upsert: false
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function uploadChatImage(userId: string, dataUrl: string): Promise<string> {
  return uploadImageToBucket('chat-images', userId, dataUrl);
}

export function uploadPostImage(userId: string, dataUrl: string): Promise<string> {
  return uploadImageToBucket('post-images', userId, dataUrl);
}
