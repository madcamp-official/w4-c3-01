import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FacingMode, Point } from '../types'
import { landmarkToStagePoint, smoothPoint } from '../utils/coordinates'

const WASM_ROOT = '/wasm'
const MODEL_URL = '/models/hand_landmarker.task'
const THUMB_TIP = 4
const INDEX_FINGER_MCP = 5
const INDEX_FINGER_TIP = 8
const PINKY_MCP = 17
const PINCH_START_RATIO = 0.35
const PINCH_RELEASE_RATIO = 0.5

function distanceBetween(first: NormalizedLandmark, second: NormalizedLandmark) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

interface UseHandTrackingOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stageRef: React.RefObject<HTMLDivElement | null>
  stream: MediaStream | null
  facingMode: FacingMode
  enabled: boolean
  onPoint: (point: Point | null, pinching: boolean) => void
}

interface UseHandTrackingResult {
  modelReady: boolean
  handDetected: boolean
  error: string | null
}

export function useHandTracking({
  videoRef,
  stageRef,
  stream,
  facingMode,
  enabled,
  onPoint,
}: UseHandTrackingOptions): UseHandTrackingResult {
  const [modelReady, setModelReady] = useState(false)
  const [handDetected, setHandDetected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const previousPointRef = useRef<Point | null>(null)
  const pinchingRef = useRef(false)
  const lastVideoTimeRef = useRef(-1)
  const onPointRef = useRef(onPoint)

  useEffect(() => {
    onPointRef.current = onPoint
  }, [onPoint])

  useEffect(() => {
    let cancelled = false

    async function loadModel() {
      setModelReady(false)
      setError(null)

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)

        let landmarker: HandLandmarker
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.55,
            minTrackingConfidence: 0.5,
          })
        } catch {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.55,
            minTrackingConfidence: 0.5,
          })
        }

        if (cancelled) {
          landmarker.close()
          return
        }

        landmarkerRef.current = landmarker
        setModelReady(true)
      } catch (modelError) {
        console.error('MediaPipe model initialization failed:', modelError)
        const detail =
          modelError instanceof Error ? modelError.message : '알 수 없는 오류'
        setError(`손 인식 모델 초기화 실패: ${detail}`)
      }
    }

    void loadModel()

    return () => {
      cancelled = true
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  const processResult = useCallback(
    (result: HandLandmarkerResult) => {
      const video = videoRef.current
      const stage = stageRef.current
      const landmarks = result.landmarks[0]
      const thumbTip = landmarks?.[THUMB_TIP]
      const indexMcp = landmarks?.[INDEX_FINGER_MCP]
      const indexTip = landmarks?.[INDEX_FINGER_TIP]
      const pinkyMcp = landmarks?.[PINKY_MCP]

      if (!video || !stage || !thumbTip || !indexMcp || !indexTip || !pinkyMcp) {
        previousPointRef.current = null
        pinchingRef.current = false
        setHandDetected(false)
        onPointRef.current(null, false)
        return
      }

      const stagePoint = landmarkToStagePoint(indexTip, video, stage, facingMode)
      if (!stagePoint) return

      const smoothed = smoothPoint(previousPointRef.current, stagePoint)
      const palmWidth = distanceBetween(indexMcp, pinkyMcp)
      const pinchRatio =
        palmWidth > 0 ? distanceBetween(thumbTip, indexTip) / palmWidth : Number.POSITIVE_INFINITY
      const pinching = pinchingRef.current
        ? pinchRatio < PINCH_RELEASE_RATIO
        : pinchRatio < PINCH_START_RATIO

      previousPointRef.current = smoothed
      pinchingRef.current = pinching
      setHandDetected(true)
      onPointRef.current(smoothed, pinching)
    },
    [facingMode, stageRef, videoRef],
  )

  useEffect(() => {
    if (!enabled || !stream || !modelReady) {
      previousPointRef.current = null
      pinchingRef.current = false
      setHandDetected(false)
      onPointRef.current(null, false)
      return
    }

    const renderLoop = () => {
      const video = videoRef.current
      const landmarker = landmarkerRef.current

      if (
        video &&
        landmarker &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== lastVideoTimeRef.current
      ) {
        try {
          const result = landmarker.detectForVideo(video, performance.now())
          processResult(result)
          lastVideoTimeRef.current = video.currentTime
        } catch (detectionError) {
          console.error(detectionError)
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop)
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      previousPointRef.current = null
      pinchingRef.current = false
      lastVideoTimeRef.current = -1
      setHandDetected(false)
      onPointRef.current(null, false)
    }
  }, [enabled, modelReady, processResult, stream, videoRef])

  return { modelReady, handDetected, error }
}
