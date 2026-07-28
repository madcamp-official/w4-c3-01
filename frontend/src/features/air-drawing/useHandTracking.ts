import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FacingMode, Point } from './types'
import { landmarkToStagePoint, smoothPoint } from './coordinates'

// The web app serves these from its own /public root. The RN WebView bundle
// (see frontend/airview/) sets window.__AIR_ASSET_BASE__ before this module
// runs, since its assets live alongside a relative index.html instead.
declare global {
  interface Window {
    __AIR_ASSET_BASE__?: string
  }
}
const ASSET_BASE = typeof window !== 'undefined' ? (window.__AIR_ASSET_BASE__ ?? '') : ''
const WASM_ROOT = `${ASSET_BASE}/wasm`
const MODEL_URL = `${ASSET_BASE}/models/hand_landmarker.task`
const WRIST = 0
const THUMB_TIP = 4
const INDEX_FINGER_MCP = 5
const INDEX_FINGER_PIP = 6
const INDEX_FINGER_TIP = 8
const MIDDLE_FINGER_MCP = 9
const MIDDLE_FINGER_PIP = 10
const MIDDLE_FINGER_TIP = 12
const RING_FINGER_MCP = 13
const RING_FINGER_PIP = 14
const RING_FINGER_TIP = 16
const PINKY_MCP = 17
const PINKY_PIP = 18
const PINKY_TIP = 20
const PINCH_START_RATIO = 0.35
const PINCH_RELEASE_RATIO = 0.5

function distanceBetween(first: NormalizedLandmark, second: NormalizedLandmark) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function isFingerExtended(
  wrist: NormalizedLandmark,
  mcp: NormalizedLandmark,
  pip: NormalizedLandmark,
  tip: NormalizedLandmark,
) {
  const towardMcpX = mcp.x - pip.x
  const towardMcpY = mcp.y - pip.y
  const towardTipX = tip.x - pip.x
  const towardTipY = tip.y - pip.y
  const vectorLength =
    Math.hypot(towardMcpX, towardMcpY) * Math.hypot(towardTipX, towardTipY)
  const bendCosine =
    vectorLength > 0
      ? (towardMcpX * towardTipX + towardMcpY * towardTipY) / vectorLength
      : 1

  return bendCosine < -0.55 && distanceBetween(wrist, tip) > distanceBetween(wrist, pip)
}

interface UseHandTrackingOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stageRef: React.RefObject<HTMLDivElement | null>
  stream: MediaStream | null
  facingMode: FacingMode
  /** Current digital zoom (CSS transform: scale() on the video) — the cursor mapping needs this to stay aligned with the visually zoomed frame. */
  zoom?: number
  enabled: boolean
  onPoint: (point: Point | null, pinching: boolean, erasing: boolean) => void
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
  zoom = 1,
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
  const erasingRef = useRef(false)
  const eraserGestureScoreRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const onPointRef = useRef(onPoint)
  const zoomRef = useRef(zoom)

  useEffect(() => {
    onPointRef.current = onPoint
  }, [onPoint])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

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
      const wrist = landmarks?.[WRIST]
      const thumbTip = landmarks?.[THUMB_TIP]
      const indexMcp = landmarks?.[INDEX_FINGER_MCP]
      const indexPip = landmarks?.[INDEX_FINGER_PIP]
      const indexTip = landmarks?.[INDEX_FINGER_TIP]
      const middleMcp = landmarks?.[MIDDLE_FINGER_MCP]
      const middlePip = landmarks?.[MIDDLE_FINGER_PIP]
      const middleTip = landmarks?.[MIDDLE_FINGER_TIP]
      const ringMcp = landmarks?.[RING_FINGER_MCP]
      const ringPip = landmarks?.[RING_FINGER_PIP]
      const ringTip = landmarks?.[RING_FINGER_TIP]
      const pinkyMcp = landmarks?.[PINKY_MCP]
      const pinkyPip = landmarks?.[PINKY_PIP]
      const pinkyTip = landmarks?.[PINKY_TIP]

      if (
        !video ||
        !stage ||
        !wrist ||
        !thumbTip ||
        !indexMcp ||
        !indexPip ||
        !indexTip ||
        !middleMcp ||
        !middlePip ||
        !middleTip ||
        !ringMcp ||
        !ringPip ||
        !ringTip ||
        !pinkyMcp ||
        !pinkyPip ||
        !pinkyTip
      ) {
        previousPointRef.current = null
        pinchingRef.current = false
        erasingRef.current = false
        eraserGestureScoreRef.current = 0
        setHandDetected(false)
        onPointRef.current(null, false, false)
        return
      }

      const twoFingerGesture =
        isFingerExtended(wrist, indexMcp, indexPip, indexTip) &&
        isFingerExtended(wrist, middleMcp, middlePip, middleTip) &&
        !isFingerExtended(wrist, ringMcp, ringPip, ringTip) &&
        !isFingerExtended(wrist, pinkyMcp, pinkyPip, pinkyTip)

      eraserGestureScoreRef.current = twoFingerGesture
        ? Math.min(4, eraserGestureScoreRef.current + 1)
        : Math.max(0, eraserGestureScoreRef.current - 1)

      const erasing = erasingRef.current
        ? eraserGestureScoreRef.current > 1
        : eraserGestureScoreRef.current >= 3
      const eraserGestureChanged = erasing !== erasingRef.current
      erasingRef.current = erasing

      const trackingLandmark = erasing
        ? {
            ...indexTip,
            x: (indexTip.x + middleTip.x) / 2,
            y: (indexTip.y + middleTip.y) / 2,
            z: (indexTip.z + middleTip.z) / 2,
          }
        : indexTip
      const stagePoint = landmarkToStagePoint(trackingLandmark, video, stage, facingMode, zoomRef.current)
      if (!stagePoint) return

      const smoothed = smoothPoint(
        eraserGestureChanged ? null : previousPointRef.current,
        stagePoint,
      )
      const palmWidth = distanceBetween(indexMcp, pinkyMcp)
      const pinchRatio =
        palmWidth > 0 ? distanceBetween(thumbTip, indexTip) / palmWidth : Number.POSITIVE_INFINITY
      const pinching =
        !erasing &&
        (pinchingRef.current
          ? pinchRatio < PINCH_RELEASE_RATIO
          : pinchRatio < PINCH_START_RATIO)

      previousPointRef.current = smoothed
      pinchingRef.current = pinching
      setHandDetected(true)
      onPointRef.current(smoothed, pinching, erasing)
    },
    [facingMode, stageRef, videoRef],
  )

  useEffect(() => {
    if (!enabled || !stream || !modelReady) {
      previousPointRef.current = null
      pinchingRef.current = false
      erasingRef.current = false
      eraserGestureScoreRef.current = 0
      setHandDetected(false)
      onPointRef.current(null, false, false)
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
      erasingRef.current = false
      eraserGestureScoreRef.current = 0
      lastVideoTimeRef.current = -1
      setHandDetected(false)
      onPointRef.current(null, false, false)
    }
  }, [enabled, modelReady, processResult, stream, videoRef])

  return { modelReady, handDetected, error }
}
