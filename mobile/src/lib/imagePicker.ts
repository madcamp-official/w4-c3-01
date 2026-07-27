// Replaces frontend/src/lib/imageFile.ts (File -> center-cropped resized JPEG data URL).
// avatar_url is stored inline as a data URL on the profiles row (no Storage upload,
// same as the web app), so we cap it at 320px to keep the row small.
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const AVATAR_SIZE = 320;

/** Opens the system photo picker, lets the user crop to a square, and returns a resized JPEG data URL — or null if cancelled. */
export async function pickAvatarDataUrl(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('사진 접근 권한이 필요해요');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1
  });
  if (result.canceled || !result.assets[0]) return null;

  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) throw new Error('사진을 처리하지 못했어요');
  return `data:image/jpeg;base64,${manipulated.base64}`;
}
