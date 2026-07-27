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
const DEFAULT_PEN_COLOR = '#ffffff'
const DEFAULT_PEN_TOOL: PenTool = 'pen'
const DEFAULT_LINE_SIZE = 6

export interface AirDrawingCapture {
  image: string
  strokes: StrokePoint[]
  drawing: AirDrawingDocument
}

interface AirDrawingStageProps {
  busy?: boolean
  onClose: () => void
  onCapture: (capture: AirDrawingCapture) => void
  onError?: (message: string) => void
}

function flattenDrawing(document: AirDrawingDocument): StrokePoint[] {
  return document.strokes.flatMap((stroke) =>
    stroke.points.map((point, index) => ({
      x: point.x,
      y: point.y,
      move: index === 0,
    })),
  )
}

function drawVideoCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  mirrored: boolean,
) {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (!sourceWidth || !sourceHeight) return

  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = width / height
  let sx = 0
  let sy = 0
  let sw = sourceWidth
  let sh = sourceHeight

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio
    sx = (sourceWidth - sw) / 2
  } else {
    sh = sourceWidth / targetRatio
    sy = (sourceHeight - sh) / 2
  }

  context.save()
  if (mirrored) {
    context.translate(width, 0)
    context.scale(-1, 1)
  }
  context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height)
  context.restore()
}

export function AirDrawingStage({
  busy = false,
  onClose,
  onCapture,
  onError,
}: AirDrawingStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const drawingCanvasRef = useRef<DrawingCanvasHandle | null>(null)
  const colorToolbarRef = useRef<ColorToolbarHandle | null>(null)
  const penStyleToolbarRef = useRef<PenStyleToolbarHandle | null>(null)
  const cameraStartRequestedRef = useRef(false)
  const [pinching, setPinching] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null)
  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR)
  const [penTool, setPenTool] = useState<PenTool>(DEFAULT_PEN_TOOL)
  const [lineSize, setLineSize] = useState(DEFAULT_LINE_SIZE)
  const [capturing, setCapturing] = useState(false)

  const {
    stream,
    facingMode,
    isStarting,
    error: cameraError,
    startCamera,
    switchCamera,
  } = useAirCamera('user')

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

  const handleTrackedPoint = useCallback(
    (point: Point | null, isPinching: boolean, isErasing: boolean) => {
      setCursorPoint(point)
      setPinching(isPinching)
      setErasing(isErasing)

      const overColorToolbar = colorToolbarRef.current?.handleAirInput(point, isPinching) ?? false
      const overPenStyleToolbar =
        penStyleToolbarRef.current?.handleAirInput(point, isPinching) ?? false

      if (!point || overColorToolbar || overPenStyleToolbar) {
        drawingCanvasRef.current?.endStroke()
      } else if (isErasing) {
        drawingCanvasRef.current?.endStroke()
        drawingCanvasRef.current?.eraseAt(point, ERASER_RADIUS)
      } else if (isPinching) {
        drawingCanvasRef.current?.addPoint(point)
      } else {
        drawingCanvasRef.current?.endStroke()
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

  const handleCapture = useCallback(() => {
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
    const MAX_DIM = 960
    const scale = Math.min(1, MAX_DIM / Math.max(rect.width, rect.height))
    const width = Math.max(1, Math.round(rect.width * scale))
    const height = Math.max(1, Math.round(rect.height * scale))
    const output = document.createElement('canvas')
    output.width = width
    output.height = height
    const context = output.getContext('2d')
    if (!context) return

    setCapturing(true)
    try {
      drawVideoCover(context, video, width, height, facingMode === 'user')
      context.fillStyle = 'rgba(242, 236, 218, 0.35)'
      context.fillRect(0, 0, width, height)
      context.drawImage(
        drawingCanvas,
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height,
        0,
        0,
        width,
        height,
      )
      const drawing = drawingHandle.getDocument()
      onCapture({
        image: output.toDataURL('image/jpeg', 0.85),
        strokes: flattenDrawing(drawing),
        drawing,
      })
    } finally {
      setCapturing(false)
    }
  }, [busy, capturing, facingMode, onCapture, onError, stream])

  const handleSwitchCamera = useCallback(async () => {
    setPinching(false)
    setErasing(false)
    setCursorPoint(null)
    drawingCanvasRef.current?.endStroke()
    await switchCamera()
  }, [switchCamera])

  return (
    <div ref={stageRef} className="air-drawing-stage">
      <video
        ref={videoRef}
        className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
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

      {cursorPoint && (
        <div
          className={`finger-cursor ${erasing ? 'erasing' : pinching ? 'drawing' : ''}`}
          style={{ transform: `translate3d(${cursorPoint.x}px, ${cursorPoint.y}px, 0)` }}
          aria-hidden="true"
        />
      )}

      <StatusIndicator status={status} error={cameraError ?? modelError} />

      <div className="air-drawing-topbar">
        <button className="icon-btn sk" onClick={onClose} aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

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

      <ColorToolbar
        ref={colorToolbarRef}
        stageRef={stageRef}
        selectedColor={penColor}
        onSelectColor={(color) => {
          drawingCanvasRef.current?.endStroke()
          setPenColor(color)
        }}
      />

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
    </div>
  )
}
