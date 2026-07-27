import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { ColorToolbar, type ColorToolbarHandle } from './components/ColorToolbar'
import { DrawingCanvas, type DrawingCanvasHandle } from './components/DrawingCanvas'
import {
  PenStyleToolbar,
  type PenStyleToolbarHandle,
} from './components/PenStyleToolbar'
import { StatusIndicator } from './components/StatusIndicator'
import { useCamera } from './hooks/useCamera'
import { useHandTracking } from './hooks/useHandTracking'
import type { AppStatus, PenTool, Point } from './types'

const ERASER_RADIUS = 42
const DEFAULT_PEN_COLOR = '#ffffff'
const DEFAULT_PEN_TOOL: PenTool = 'pen'
const DEFAULT_LINE_SIZE = 6

export default function App() {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const drawingCanvasRef = useRef<DrawingCanvasHandle | null>(null)
  const colorToolbarRef = useRef<ColorToolbarHandle | null>(null)
  const penStyleToolbarRef = useRef<PenStyleToolbarHandle | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [pinching, setPinching] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null)
  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR)
  const [penTool, setPenTool] = useState<PenTool>(DEFAULT_PEN_TOOL)
  const [lineSize, setLineSize] = useState(DEFAULT_LINE_SIZE)

  const {
    stream,
    facingMode,
    isStarting,
    error: cameraError,
    startCamera,
    switchCamera,
  } = useCamera('user')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.srcObject = stream
    if (stream) {
      void video.play().catch((error) => console.error('video.play failed', error))
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
      const overToolbar = overColorToolbar || overPenStyleToolbar

      if (!point) {
        drawingCanvasRef.current?.endStroke()
        return
      }

      if (overToolbar || !drawing) {
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
    [drawing],
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
    if (!stream) {
      setDrawing(false)
      setPinching(false)
      setErasing(false)
      setCursorPoint(null)
      drawingCanvasRef.current?.endStroke()
    }
  }, [stream])

  const status = useMemo<AppStatus>(() => {
    if (cameraError || modelError) return '오류 발생'
    if (!stream) return '카메라 대기'
    if (!modelReady) return '모델 불러오는 중'
    if (drawing && handDetected && erasing) return '지우는 중'
    if (drawing && handDetected && pinching) return '그리는 중'
    if (drawing && !handDetected) return '손 찾는 중'
    if (handDetected) return '손 인식됨'
    return '그리기 중지'
  }, [cameraError, drawing, erasing, handDetected, modelError, modelReady, pinching, stream])

  const toggleDrawing = useCallback(() => {
    setDrawing((current) => {
      if (current) drawingCanvasRef.current?.endStroke()
      return !current
    })
  }, [])

  const handleSwitchCamera = useCallback(async () => {
    setDrawing(false)
    setPinching(false)
    setErasing(false)
    setCursorPoint(null)
    drawingCanvasRef.current?.endStroke()
    await switchCamera()
  }, [switchCamera])

  const handleSelectColor = useCallback((color: string) => {
    drawingCanvasRef.current?.endStroke()
    setPenColor(color)
  }, [])

  const handleSelectPenTool = useCallback((tool: PenTool) => {
    drawingCanvasRef.current?.endStroke()
    setPenTool(tool)
  }, [])

  return (
    <main className="app-shell">
      <section ref={stageRef} className="camera-stage">
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
            className={`finger-cursor ${
              drawing && erasing ? 'erasing' : drawing && pinching ? 'drawing' : ''
            }`}
            style={{ transform: `translate3d(${cursorPoint.x}px, ${cursorPoint.y}px, 0)` }}
            aria-hidden="true"
          />
        )}

        {!stream && (
          <div className="empty-state">
            <div className="hand-icon">☝️</div>
            <h1>Airwriting MVP</h1>
            <p>엄지와 검지를 맞대면 그리고, 검지와 중지를 펴면 지울 수 있어요.</p>
          </div>
        )}

        <StatusIndicator status={status} error={cameraError ?? modelError} />

        <ControlPanel
          cameraActive={Boolean(stream)}
          drawing={drawing}
          busy={isStarting}
          onStartCamera={() => void startCamera()}
          onToggleDrawing={toggleDrawing}
          onClear={() => drawingCanvasRef.current?.clear()}
          onSwitchCamera={() => void handleSwitchCamera()}
        />

        <ColorToolbar
          ref={colorToolbarRef}
          stageRef={stageRef}
          selectedColor={penColor}
          onSelectColor={handleSelectColor}
        />

        <PenStyleToolbar
          ref={penStyleToolbarRef}
          stageRef={stageRef}
          selectedTool={penTool}
          onSelectTool={handleSelectPenTool}
          lineSize={lineSize}
          onSelectLineSize={setLineSize}
        />
      </section>
    </main>
  )
}
