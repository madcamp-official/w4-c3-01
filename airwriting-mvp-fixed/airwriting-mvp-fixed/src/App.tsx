import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { DrawingCanvas, type DrawingCanvasHandle } from './components/DrawingCanvas'
import { StatusIndicator } from './components/StatusIndicator'
import { useCamera } from './hooks/useCamera'
import { useHandTracking } from './hooks/useHandTracking'
import type { AppStatus, Point } from './types'

export default function App() {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const drawingCanvasRef = useRef<DrawingCanvasHandle | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [pinching, setPinching] = useState(false)
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null)

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
    (point: Point | null, isPinching: boolean) => {
      setCursorPoint(point)
      setPinching(isPinching)

      if (!point) {
        drawingCanvasRef.current?.endStroke()
        return
      }

      if (drawing && isPinching) {
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
      setCursorPoint(null)
      drawingCanvasRef.current?.endStroke()
    }
  }, [stream])

  const status = useMemo<AppStatus>(() => {
    if (cameraError || modelError) return '오류 발생'
    if (!stream) return '카메라 대기'
    if (!modelReady) return '모델 불러오는 중'
    if (drawing && handDetected && pinching) return '그리는 중'
    if (drawing && !handDetected) return '손 찾는 중'
    if (handDetected) return '손 인식됨'
    return '그리기 중지'
  }, [cameraError, drawing, handDetected, modelError, modelReady, pinching, stream])

  const toggleDrawing = useCallback(() => {
    setDrawing((current) => {
      if (current) drawingCanvasRef.current?.endStroke()
      return !current
    })
  }, [])

  const handleSwitchCamera = useCallback(async () => {
    setDrawing(false)
    setPinching(false)
    setCursorPoint(null)
    drawingCanvasRef.current?.endStroke()
    await switchCamera()
  }, [switchCamera])

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

        <DrawingCanvas ref={drawingCanvasRef} stageRef={stageRef} />

        {cursorPoint && (
          <div
            className={`finger-cursor ${drawing && pinching ? 'drawing' : ''}`}
            style={{ transform: `translate3d(${cursorPoint.x}px, ${cursorPoint.y}px, 0)` }}
            aria-hidden="true"
          />
        )}

        {!stream && (
          <div className="empty-state">
            <div className="hand-icon">☝️</div>
            <h1>Airwriting MVP</h1>
            <p>엄지와 검지를 맞댄 채 손을 움직여 허공에 그림을 그려보세요.</p>
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
      </section>
    </main>
  )
}
