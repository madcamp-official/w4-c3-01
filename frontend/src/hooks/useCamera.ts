import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera(facingMode: 'user' | 'environment') {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraAvailable(true);
    } catch {
      setCameraAvailable(false);
    }
  }, [facingMode]);

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, cameraAvailable, streamActive: () => Boolean(streamRef.current), start, stop };
}
