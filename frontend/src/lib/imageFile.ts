/**
 * Reads an image file, center-crops it to a square, and resizes it down to
 * a small JPEG data URL — used for profile photos so we can store them
 * directly on the profile row (same approach as the hand-drawn heart)
 * without needing a Storage upload before the user is authenticated.
 */
export function fileToResizedDataUrl(file: File, size = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('이미지를 처리하지 못했어요'));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러오지 못했어요'));
    };
    img.src = objectUrl;
  });
}
