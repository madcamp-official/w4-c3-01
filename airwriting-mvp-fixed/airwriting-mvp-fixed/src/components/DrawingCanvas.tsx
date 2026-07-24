import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import type { Point, Stroke } from '../types'

export interface DrawingCanvasHandle {
  addPoint: (point: Point) => void
  endStroke: () => void
  clear: () => void
}

interface DrawingCanvasProps {
  stageRef: React.RefObject<HTMLDivElement | null>
}

const LINE_WIDTH = 6
const LINE_COLOR = '#ffffff'

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ stageRef }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const strokesRef = useRef<Stroke[]>([])
    const currentStrokeRef = useRef<Stroke | null>(null)

    const getContext = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.getContext('2d')
    }, [])

    const prepareContext = useCallback((context: CanvasRenderingContext2D) => {
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = LINE_COLOR
      context.lineWidth = LINE_WIDTH
      context.shadowColor = 'rgba(0, 0, 0, 0.35)'
      context.shadowBlur = 4
    }, [])

    const redraw = useCallback(() => {
      const canvas = canvasRef.current
      const context = getContext()
      if (!canvas || !context) return

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      context.clearRect(0, 0, width, height)
      prepareContext(context)

      for (const stroke of strokesRef.current) {
        if (stroke.length === 0) continue

        context.beginPath()
        context.moveTo(stroke[0].x * width, stroke[0].y * height)
        for (let index = 1; index < stroke.length; index += 1) {
          context.lineTo(stroke[index].x * width, stroke[index].y * height)
        }
        context.stroke()
      }
    }, [getContext, prepareContext])

    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current
      const stage = stageRef.current
      if (!canvas || !stage) return

      const width = stage.clientWidth
      const height = stage.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const context = canvas.getContext('2d')
      context?.setTransform(dpr, 0, 0, dpr, 0, 0)
      redraw()
    }, [redraw, stageRef])

    useEffect(() => {
      resizeCanvas()
      const stage = stageRef.current
      if (!stage) return

      const observer = new ResizeObserver(resizeCanvas)
      observer.observe(stage)

      return () => observer.disconnect()
    }, [resizeCanvas, stageRef])

    useImperativeHandle(
      ref,
      () => ({
        addPoint(point: Point) {
          const canvas = canvasRef.current
          const context = getContext()
          if (!canvas || !context || canvas.clientWidth === 0 || canvas.clientHeight === 0) return

          const normalized = {
            x: point.x / canvas.clientWidth,
            y: point.y / canvas.clientHeight,
          }

          let stroke = currentStrokeRef.current
          if (!stroke) {
            stroke = [normalized]
            currentStrokeRef.current = stroke
            strokesRef.current.push(stroke)
            return
          }

          const previous = stroke[stroke.length - 1]
          stroke.push(normalized)

          prepareContext(context)
          context.beginPath()
          context.moveTo(previous.x * canvas.clientWidth, previous.y * canvas.clientHeight)
          context.lineTo(normalized.x * canvas.clientWidth, normalized.y * canvas.clientHeight)
          context.stroke()
        },
        endStroke() {
          currentStrokeRef.current = null
        },
        clear() {
          strokesRef.current = []
          currentStrokeRef.current = null
          const canvas = canvasRef.current
          const context = getContext()
          if (canvas && context) {
            context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
          }
        },
      }),
      [getContext, prepareContext],
    )

    return <canvas ref={canvasRef} className="drawing-canvas" aria-label="에어라이팅 캔버스" />
  },
)
