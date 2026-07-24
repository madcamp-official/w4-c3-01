import { useCallback, useEffect, useRef, useState } from 'react'
import type { FacingMode } from '../types'

interface UseCameraResult {
  stream: MediaStream | null
  facingMode: FacingMode
  isStarting: boolean
  error: string | null
  startCamera: (nextFacingMode?: FacingMode) => Promise<void>
  stopCamera: () => void
  switchCamera: () => Promise<void>
}

function toReadableCameraError(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return '카메라를 시작하지 못했습니다.'
  }

  switch (error.name) {
    case 'NotAllowedError':
      return '카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.'
    case 'NotFoundError':
      return '사용 가능한 카메라를 찾지 못했습니다.'
    case 'NotReadableError':
      return '다른 앱이 카메라를 사용 중일 수 있습니다.'
    case 'OverconstrainedError':
      return '요청한 카메라 조건을 지원하지 않습니다.'
    default:
      return `카메라 오류: ${error.message || error.name}`
  }
}

export function useCamera(initialFacingMode: FacingMode = 'user'): UseCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<FacingMode>(initialFacingMode)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const startCamera = useCallback(
    async (nextFacingMode: FacingMode = facingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('카메라는 HTTPS 또는 localhost 환경에서만 사용할 수 있습니다.')
        return
      }

      setIsStarting(true)
      setError(null)
      stopCamera()

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: nextFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        streamRef.current = nextStream
        setStream(nextStream)
        setFacingMode(nextFacingMode)
      } catch (cameraError) {
        setError(toReadableCameraError(cameraError))
      } finally {
        setIsStarting(false)
      }
    },
    [facingMode, stopCamera],
  )

  const switchCamera = useCallback(async () => {
    const nextFacingMode: FacingMode = facingMode === 'user' ? 'environment' : 'user'
    await startCamera(nextFacingMode)
  }, [facingMode, startCamera])

  useEffect(() => stopCamera, [stopCamera])

  return {
    stream,
    facingMode,
    isStarting,
    error,
    startCamera,
    stopCamera,
    switchCamera,
  }
}
