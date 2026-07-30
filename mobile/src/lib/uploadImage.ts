// Adapted from frontend/src/lib/uploadImage.ts — keep in sync.
// RN's Blob-from-atob path uploads 0-byte objects to Supabase Storage, so we
// decode the base64 payload straight to an ArrayBuffer instead.
import { decode } from 'base64-arraybuffer';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabaseClient';

function dataUrlToArrayBuffer(dataUrl: string): { buffer: ArrayBuffer; mime: string } {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? 'image/png';
  return { buffer: decode(base64), mime };
}

async function mediaToArrayBuffer(source: string, fallbackMime: string): Promise<{ buffer: ArrayBuffer; mime: string }> {
  if (source.startsWith('data:')) return dataUrlToArrayBuffer(source);
  const file = new File(source);
  return {
    buffer: await file.arrayBuffer(),
    mime: file.type || fallbackMime,
  };
}

/** Uploads a captured PNG/JPEG (data URL) to the given public bucket, under the uploader's own uid folder, and returns its public URL. */
async function uploadImageToBucket(bucket: string, userId: string, dataUrl: string): Promise<string> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요');
  const { buffer, mime } = await mediaToArrayBuffer(dataUrl, 'image/png');
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'video/webm' ? 'webm' : 'png';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: mime,
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

export function uploadAvatarImage(userId: string, dataUrl: string): Promise<string> {
  return uploadImageToBucket('avatars', userId, dataUrl);
}

export function uploadPostVideo(userId: string, uri: string): Promise<string> {
  return uploadImageToBucket('post-images', userId, uri);
}
