import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ColorToolbar, type ColorToolbarHandle } from './ColorToolbar'
import { DrawingCanvas, type DrawingCanvasHandle } from './DrawingCanvas'
import { PenStyleToolbar, type PenStyleToolbarHandle } from './PenStyleToolbar'
import { StatusIndicator } from './StatusIndicator'
import { useAirCamera } from './useAirCamera'
import { useHandTracking } from './useHandTracking'
import type { AirDrawingDocument, AppStatus, PenTool, Point } from './types'
import type { StrokePoint } from '@/types'
import './air-drawing.css'

const ERASER_RADIUS = 42
// Hand-tracking noise moves the erase point by a pixel or two even when the
// hand is basically still, and every eraseAt() call fully re-slices and
// redraws every stroke near the circle. For spray (per-segment random dots)
// and dashed (phase-dependent pattern) tools that constant tiny re-slicing
// visibly flickered/"moved" right at the eraser edge. Skipping erase updates
// smaller than this removes that jitter without making the eraser feel less
// responsive for real motion.
const ERASE_MIN_STEP = 3
const DEFAULT_PEN_COLOR = '#ffffff'
const DEFAULT_PEN_TOOL: PenTool = 'pen'
const DEFAULT_LINE_SIZE = 6
const INK_COLOR = '#1E1B16'

export interface AirDrawingCapture {
  image: string
  strokes: StrokePoint[]
  drawing: AirDrawingDocument
}

/**
 * post/lounge: camera frame composited into the capture (today's default).
 * heart/message: ink-only on a flat paper background, fixed square output —
 * used by the RN app's WebView bridge (Phase 4) for the profile heart and
 * in-chat air-write message capture flows.
 */
export type AirDrawingMode = 'post' | 'lounge' | 'heart' | 'message'

interface AirDrawingStageProps {
  busy?: boolean
  mode?: AirDrawingMode
  /** Square output size in px for heart/message modes (ignored for post/lounge, which use maxDim instead). */
  outputSize?: number
  /** Longest-edge cap for post/lounge captures. */
  maxDim?: number
  onClose: () => void
  onCapture: (capture: AirDrawingCapture) => void
  onError?: (message: string) => void
  onSwipeUpHome?: () => void
}

// Square (outputSize) captures crop the drawing canvas to a region centered
// on the stroke bounding box (see handleCapture) rather than the full canvas
// — so points must be remapped into that same crop's 0..1 space, or the
// replayed path reads squashed/offset relative to the (already-cropped) photo.
function flattenDrawing(
  document: AirDrawingDocument,
  crop?: { x: number; y: number; size: number; canvasWidth: number; canvasHeight: number },
): StrokePoint[] {
  return document.strokes.flatMap((stroke) =>
    stroke.points.map((point, index) => {
      let x = point.x
      let y = point.y
      if (crop) {
        x = (point.x * crop.canvasWidth - crop.x) / crop.size
        y = (point.y * crop.canvasHeight - crop.y) / crop.size
      }
      return { x, y, move: index === 0 }
    }),
  )
}

function computeCoverSourceRect(sourceWidth: number, sourceHeight: number, width: number, height: number, zoom: number) {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = width / height
  let sw = sourceWidth
  let sh = sourceHeight

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio
  } else {
    sh = sourceWidth / targetRatio
  }

  // Digital zoom: sample a smaller, centered region of the frame — matches
  // the CSS scale() applied to the live <video> preview (see zoomValue).
  sw /= zoom
  sh /= zoom
  const sx = (sourceWidth - sw) / 2
  const sy = (sourceHeight - sh) / 2
  return { sx, sy, sw, sh }
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  mirrored: boolean,
  zoom: number = 1,
) {
  if (!sourceWidth || !sourceHeight) return
  const { sx, sy, sw, sh } = computeCoverSourceRect(sourceWidth, sourceHeight, width, height, zoom)

  context.save()
  if (mirrored) {
    context.translate(width, 0)
    context.scale(-1, 1)
  }
  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height)
  context.restore()
}

function drawCenteredStageSquare(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  stageWidth: number,
  stageHeight: number,
  outputSize: number,
  mirrored: boolean,
  zoom: number,
) {
  const stageScale = outputSize / Math.min(stageWidth, stageHeight)
  const renderedStageWidth = Math.max(1, Math.round(stageWidth * stageScale))
  const renderedStageHeight = Math.max(1, Math.round(stageHeight * stageScale))
  const stageCanvas = document.createElement('canvas')
  stageCanvas.width = renderedStageWidth
  stageCanvas.height = renderedStageHeight
  const stageContext = stageCanvas.getContext('2d')
  if (!stageContext) return

  drawCover(
    stageContext,
    source,
    sourceWidth,
    sourceHeight,
    renderedStageWidth,
    renderedStageHeight,
    mirrored,
    zoom,
  )

  const cropSize = Math.min(renderedStageWidth, renderedStageHeight)
  const cropX = (renderedStageWidth - cropSize) / 2
  const cropY = (renderedStageHeight - cropSize) / 2
  context.drawImage(stageCanvas, cropX, cropY, cropSize, cropSize, 0, 0, outputSize, outputSize)
}

type ImageCaptureLike = { takePhoto: () => Promise<Blob> }

// The live <video> stream is often capped well below the camera's actual
// still-photo resolution (Chromium negotiates a lower preview mode for
// performance) — ImageCapture.takePhoto() asks the hardware for a real still
// photo instead, which is usually a meaningfully higher-resolution frame.
// Support is inconsistent across Android WebViews, so this is best-effort
// and falls back silently to sampling the <video> element when unavailable.
async function grabHighResPhoto(stream: MediaStream): Promise<ImageBitmap | null> {
  const track = stream.getVideoTracks()[0]
  const ImageCaptureCtor = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => ImageCaptureLike })
    .ImageCapture
  if (!track || !ImageCaptureCtor) return null
  try {
    const capture = new ImageCaptureCtor(track)
    const blob = await capture.takePhoto()
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

export function AirDrawingStage({
  busy = false,
  mode = 'post',
  outputSize,
  maxDim = 2400,
  onClose,
  onCapture,
  onError,
  onSwipeUpHome,
}: AirDrawingStageProps) {
  // 하트(좋아요 아이콘)만 카메라 없이 종이+선으로 찍습니다. 채팅 손글씨 메시지와
  // 게시물/라운지는 카메라 프레임을 그대로 합성합니다.
  const isPaperMode = mode === 'heart'
  const isSquarePostMode = mode === 'post'
  const showToolbars = mode !== 'heart'
  const zoomEnabled = mode !== 'heart'

  const stageRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const drawingCanvasRef = useRef<DrawingCanvasHandle | null>(null)
  const colorToolbarRef = useRef<ColorToolbarHandle | null>(null)
  const penStyleToolbarRef = useRef<PenStyleToolbarHandle | null>(null)
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const cameraStartRequestedRef = useRef(false)
  const lastErasePointRef = useRef<Point | null>(null)
  const [pinching, setPinching] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [penColor, setPenColor] = useState(isPaperMode ? INK_COLOR : DEFAULT_PEN_COLOR)
  const [penTool, setPenTool] = useState<PenTool>(DEFAULT_PEN_TOOL)
  const [lineSize, setLineSize] = useState(DEFAULT_LINE_SIZE)
  const [capturing, setCapturing] = useState(false)
  const [zoomValue, setZoomValue] = useState(1)

  const {
    stream,
    facingMode,
    isStarting,
    error: cameraError,
    startCamera,
    switchCamera,
  } = useAirCamera('environment')

  useEffect(() => {
    if (cameraStartRequestedRef.current) return
    cameraStartRequestedRef.current = true
    void startCamera()
  }, [startCamera])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    if (stream) {
      void video.play().catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('video.play failed', error)
        }
      })
    }
  }, [stream])

  // Reset to 1x whenever the camera (re)starts or is switched, so a stale
  // zoom level from the previous session/camera doesn't carry over.
  useEffect(() => {
    setZoomValue(1)
  }, [stream])

  const ZOOM_MIN = 1
  const ZOOM_MAX = 5

  // Mirrors zoomValue into a ref so the touch-pinch listeners below (attached
  // once, not re-attached on every zoom change) can read the *current* zoom
  // when a new pinch gesture begins, without needing to be recreated.
  const zoomValueRef = useRef(zoomValue)
  useEffect(() => {
    zoomValueRef.current = zoomValue
  }, [zoomValue])

  // Two-finger pinch to zoom, like a regular camera app — distinct from the
  // hand-tracking "air pinch" (thumb+index in front of the camera) used for
  // drawing, which never touches the screen at all, so the two don't compete.
  // Attached via addEventListener (not JSX onTouchMove) because React makes
  // touchmove passive by default, so preventDefault() there wouldn't actually
  // stop the WebView's native page-zoom from also kicking in.
  useEffect(() => {
    const el = stageRef.current
    if (!el || !zoomEnabled) return

    const touchDistance = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]]
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }

    let pinchStartDistance: number | null = null
    let pinchStartZoom = 1

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchStartDistance = touchDistance(e.touches)
        pinchStartZoom = zoomValueRef.current
      }
    }
    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchStartDistance) {
        e.preventDefault()
        const ratio = touchDistance(e.touches) / pinchStartDistance
        setZoomValue(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchStartZoom * ratio)))
      }
    }
    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinchStartDistance = null
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [zoomEnabled])

  useEffect(() => {
    const element = stageRef.current
    if (!element || !onSwipeUpHome) return
    const goHome = onSwipeUpHome

    let start: { x: number; y: number } | null = null
    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        start = null
        return
      }
      start = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      }
    }
    function handleTouchEnd(event: TouchEvent) {
      const touch = event.changedTouches[0]
      if (!start || !touch) return
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      start = null
      if (deltaY < -96 && Math.abs(deltaY) > Math.abs(deltaX) * 1.35) {
        goHome()
      }
    }
    function cancelSwipe() {
      start = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', cancelSwipe)
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', cancelSwipe)
    }
  }, [onSwipeUpHome])

  const handleTrackedPoint = useCallback(
    (point: Point | null, isPinching: boolean, isErasing: boolean) => {
      setPinching(isPinching)
      setErasing(isErasing)

      const cursor = cursorRef.current
      if (cursor) {
        cursor.style.opacity = point ? '1' : '0'
        if (point) cursor.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
        cursor.className = `finger-cursor ${isErasing ? 'erasing' : isPinching ? 'drawing' : ''}`
      }

      const overColorToolbar =
        colorToolbarRef.current?.handleAirInput(point, isPinching, isErasing) ?? false
      const overPenStyleToolbar =
        penStyleToolbarRef.current?.handleAirInput(point, isPinching, isErasing) ?? false

      if (!point || overColorToolbar || overPenStyleToolbar) {
        drawingCanvasRef.current?.endStroke()
        if (!point) lastErasePointRef.current = null
      } else if (isErasing) {
        drawingCanvasRef.current?.endStroke()
        const last = lastErasePointRef.current
        if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= ERASE_MIN_STEP) {
          drawingCanvasRef.current?.eraseAt(point, ERASER_RADIUS)
          lastErasePointRef.current = point
        }
      } else {
        lastErasePointRef.current = null
        if (isPinching) drawingCanvasRef.current?.addPoint(point)
        else drawingCanvasRef.current?.endStroke()
      }
    },
    [],
  )

  const {
    modelReady,
    handDetected,
    error: modelError,
  } = useHandTracking({
    videoRef,
    stageRef,
    stream,
    facingMode,
    zoom: zoomValue,
    enabled: Boolean(stream),
    onPoint: handleTrackedPoint,
  })

  useEffect(() => {
    const error = cameraError ?? modelError
    if (error) onError?.(error)
  }, [cameraError, modelError, onError])

  const status = useMemo<AppStatus>(() => {
    if (cameraError || modelError) return '오류 발생'
    if (!stream) return '카메라 대기'
    if (!modelReady) return '모델 불러오는 중'
    if (handDetected && erasing) return '지우는 중'
    if (handDetected && pinching) return '그리는 중'
    if (!handDetected) return '손 찾는 중'
    return '손 인식됨'
  }, [cameraError, erasing, handDetected, modelError, modelReady, pinching, stream])

  const handleCapture = useCallback(async () => {
    const stage = stageRef.current
    const video = videoRef.current
    const drawingHandle = drawingCanvasRef.current
    const drawingCanvas = drawingHandle?.getCanvas()
    if (!stage || !video || !drawingHandle || !drawingCanvas || !stream || capturing || busy) return
    if (!drawingHandle.hasDrawing()) {
      onError?.('먼저 허공에 무언가를 그려주세요')
      return
    }

    const rect = stage.getBoundingClientRect()
    let width: number
    let height: number
    if (isSquarePostMode) {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const squareSize = Math.min(maxDim, Math.round(Math.min(rect.width, rect.height) * dpr))
      width = squareSize
      height = squareSize
    } else if (outputSize) {
      width = outputSize
      height = outputSize
    } else {
      // getBoundingClientRect() is in CSS pixels, not device pixels — on a
      // typical 2-3x DPR phone that alone was capping captures to a few
      // hundred px on the long edge (well under maxDim) regardless of the
      // camera's actual resolution, which read as "low quality" photos.
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const rawWidth = rect.width * dpr
      const rawHeight = rect.height * dpr
      const scale = Math.min(1, maxDim / Math.max(rawWidth, rawHeight))
      width = Math.max(1, Math.round(rawWidth * scale))
      height = Math.max(1, Math.round(rawHeight * scale))
    }
    const output = document.createElement('canvas')
    output.width = width
    output.height = height
    const context = output.getContext('2d')
    if (!context) return
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    setCapturing(true)
    try {
      if (isPaperMode) {
        // 배경을 아예 채우지 않고 투명하게 둡니다 — 좋아요 버튼 아이콘으로 쓸 것이라
        // 그린 선만 남아야 합니다 (캔버스 기본값이 투명이라 따로 지울 것도 없음).
      } else {
        let hqPhoto = await grabHighResPhoto(stream)
        if (hqPhoto && hqPhoto.width * hqPhoto.height < video.videoWidth * video.videoHeight) {
          hqPhoto.close()
          hqPhoto = null
        }
        if (hqPhoto) {
          if (isSquarePostMode) {
            drawCenteredStageSquare(
              context,
              hqPhoto,
              hqPhoto.width,
              hqPhoto.height,
              rect.width,
              rect.height,
              width,
              facingMode === 'user',
              zoomValue,
            )
          } else {
            drawCover(context, hqPhoto, hqPhoto.width, hqPhoto.height, width, height, facingMode === 'user', zoomValue)
          }
          hqPhoto.close()
        } else {
          if (isSquarePostMode) {
            drawCenteredStageSquare(
              context,
              video,
              video.videoWidth,
              video.videoHeight,
              rect.width,
              rect.height,
              width,
              facingMode === 'user',
              zoomValue,
            )
          } else {
            drawCover(context, video, video.videoWidth, video.videoHeight, width, height, facingMode === 'user', zoomValue)
          }
        }
      }
      const drawing = drawingHandle.getDocument()
      let cropForStrokes: { x: number; y: number; size: number; canvasWidth: number; canvasHeight: number } | undefined
      if (isSquarePostMode) {
        const cropSize = Math.min(drawingCanvas.width, drawingCanvas.height)
        const cropX = (drawingCanvas.width - cropSize) / 2
        const cropY = (drawingCanvas.height - cropSize) / 2
        context.drawImage(drawingCanvas, cropX, cropY, cropSize, cropSize, 0, 0, width, height)
        cropForStrokes = {
          x: cropX,
          y: cropY,
          size: cropSize,
          canvasWidth: drawingCanvas.width,
          canvasHeight: drawingCanvas.height,
        }
      } else if (outputSize) {
        // 정사각형 출력(하트/메시지)은 늘리지 않고 정사각형으로 잘라냅니다 — 그대로
        // 늘리면 세로로 긴 화면이 눌린 것처럼 찌그러져 보입니다. 잘라내는 영역은
        // 캔버스 전체가 아니라 실제로 그린 부분(스트로크의 바운딩 박스)에 여백만 살짝
        // 더한 크기로 맞춰서, 사람마다 허공에 그리는 크기가 달라도 결과물 안에서
        // 그림이 차지하는 비율이 비슷하게 나오도록 합니다(작게 그리면 확대되는 효과).
        let minX = 1
        let minY = 1
        let maxX = 0
        let maxY = 0
        drawing.strokes.forEach((stroke) =>
          stroke.points.forEach((p) => {
            minX = Math.min(minX, p.x)
            maxX = Math.max(maxX, p.x)
            minY = Math.min(minY, p.y)
            maxY = Math.max(maxY, p.y)
          }),
        )
        const minCanvasSide = Math.min(drawingCanvas.width, drawingCanvas.height)
        const bboxWidthPx = (maxX - minX) * drawingCanvas.width
        const bboxHeightPx = (maxY - minY) * drawingCanvas.height
        const BBOX_PADDING = 1.4
        const cropSize = Math.min(
          Math.max(Math.max(bboxWidthPx, bboxHeightPx) * BBOX_PADDING, minCanvasSide * 0.15),
          minCanvasSide,
        )
        const centerX = ((minX + maxX) / 2) * drawingCanvas.width
        const centerY = ((minY + maxY) / 2) * drawingCanvas.height
        const cropX = Math.min(Math.max(centerX - cropSize / 2, 0), drawingCanvas.width - cropSize)
        const cropY = Math.min(Math.max(centerY - cropSize / 2, 0), drawingCanvas.height - cropSize)
        context.drawImage(drawingCanvas, cropX, cropY, cropSize, cropSize, 0, 0, width, height)
        cropForStrokes = { x: cropX, y: cropY, size: cropSize, canvasWidth: drawingCanvas.width, canvasHeight: drawingCanvas.height }
      } else {
        context.drawImage(drawingCanvas, 0, 0, drawingCanvas.width, drawingCanvas.height, 0, 0, width, height)
      }
      onCapture({
        image: isPaperMode ? output.toDataURL('image/png') : output.toDataURL('image/jpeg', 0.92),
        strokes: flattenDrawing(drawing, cropForStrokes),
        drawing,
      })
    } finally {
      setCapturing(false)
    }
  }, [busy, capturing, facingMode, isPaperMode, isSquarePostMode, maxDim, onCapture, onError, outputSize, stream, zoomValue])

  const handleSwitchCamera = useCallback(async () => {
    setPinching(false)
    setErasing(false)
    if (cursorRef.current) cursorRef.current.style.opacity = '0'
    drawingCanvasRef.current?.endStroke()
    await switchCamera()
  }, [switchCamera])

  return (
    <div ref={stageRef} className="air-drawing-stage">
      <video
        ref={videoRef}
        className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
        style={{ transform: `${facingMode === 'user' ? 'scaleX(-1) ' : ''}scale(${zoomValue}) translateZ(0)` }}
        playsInline
        muted
        autoPlay
      />

      <DrawingCanvas
        ref={drawingCanvasRef}
        stageRef={stageRef}
        color={penColor}
        tool={penTool}
        lineSize={lineSize}
      />

      {isSquarePostMode ? <div className="square-capture-guide" aria-hidden="true" /> : null}

      <div ref={cursorRef} className="finger-cursor" style={{ opacity: 0 }} aria-hidden="true" />

      <StatusIndicator status={status} error={cameraError ?? modelError} />

      <div className="air-drawing-topbar">
        <button className="icon-btn sk" onClick={onClose} aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {zoomEnabled && zoomValue > 1.02 ? <div className="zoom-badge">{zoomValue.toFixed(1)}x</div> : null}
      {onSwipeUpHome ? <div className="widget-home-hint">↑ 위로 밀어 홈으로</div> : null}

      <div className="air-capture-panel">
        <button
          className="side-btn sk"
          onClick={() => drawingCanvasRef.current?.clear()}
          aria-label="전체 지우기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
        </button>
        <button
          className="shutter sk2"
          aria-label="촬영"
          disabled={capturing || busy || isStarting || !modelReady}
          onClick={handleCapture}
        />
        <button
          className="side-btn sk"
          onClick={() => void handleSwitchCamera()}
          disabled={isStarting}
          aria-label="카메라 전환"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M17 2l4 4-4 4" />
            <path d="M3 12v-2a4 4 0 0 1 4-4h14" />
            <path d="M7 22l-4-4 4-4" />
            <path d="M21 12v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>

      {showToolbars ? (
        <ColorToolbar
          ref={colorToolbarRef}
          stageRef={stageRef}
          selectedColor={penColor}
          onSelectColor={(color) => {
            drawingCanvasRef.current?.endStroke()
            setPenColor(color)
          }}
        />
      ) : null}

      {showToolbars ? (
        <PenStyleToolbar
          ref={penStyleToolbarRef}
          stageRef={stageRef}
          selectedTool={penTool}
          onSelectTool={(tool) => {
            drawingCanvasRef.current?.endStroke()
            setPenTool(tool)
          }}
          lineSize={lineSize}
          onSelectLineSize={setLineSize}
        />
      ) : null}
    </div>
  )
}
