import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import type { Point, Stroke } from '../types'

export interface DrawingCanvasHandle {
  addPoint: (point: Point) => void
  eraseAt: (point: Point, radius: number) => void
  endStroke: () => void
  clear: () => void
}

interface DrawingCanvasProps {
  stageRef: React.RefObject<HTMLDivElement | null>
  color: string
}

const LINE_WIDTH = 6
const GEOMETRY_EPSILON = 0.0001

interface PaintedStroke {
  points: Stroke
  color: string
}

function splitStrokeOutsideCircle(
  paintedStroke: PaintedStroke,
  center: Point,
  radius: number,
  width: number,
  height: number,
) {
  const stroke = paintedStroke.points
  if (stroke.length < 2) {
    const point = stroke[0]
    if (!point) return []
    const distance = Math.hypot(point.x * width - center.x, point.y * height - center.y)
    return distance > radius ? [paintedStroke] : []
  }

  const fragments: PaintedStroke[] = []
  let currentFragment: Stroke | null = null

  const appendPoint = (fragment: Stroke, x: number, y: number) => {
    const normalized = { x: x / width, y: y / height }
    const previous = fragment[fragment.length - 1]
    if (
      !previous ||
      Math.abs(previous.x - normalized.x) > GEOMETRY_EPSILON ||
      Math.abs(previous.y - normalized.y) > GEOMETRY_EPSILON
    ) {
      fragment.push(normalized)
    }
  }

  const finishFragment = () => {
    if (currentFragment && currentFragment.length >= 2) {
      fragments.push({ points: currentFragment, color: paintedStroke.color })
    }
    currentFragment = null
  }

  for (let index = 1; index < stroke.length; index += 1) {
    const first = {
      x: stroke[index - 1].x * width,
      y: stroke[index - 1].y * height,
    }
    const second = {
      x: stroke[index].x * width,
      y: stroke[index].y * height,
    }
    const dx = second.x - first.x
    const dy = second.y - first.y
    const offsetX = first.x - center.x
    const offsetY = first.y - center.y
    const quadraticA = dx * dx + dy * dy
    const quadraticB = 2 * (offsetX * dx + offsetY * dy)
    const quadraticC = offsetX * offsetX + offsetY * offsetY - radius * radius
    const boundaries = [0, 1]

    if (quadraticA > 0) {
      const discriminant = quadraticB * quadraticB - 4 * quadraticA * quadraticC
      if (discriminant > 0) {
        const root = Math.sqrt(discriminant)
        const firstIntersection = (-quadraticB - root) / (2 * quadraticA)
        const secondIntersection = (-quadraticB + root) / (2 * quadraticA)
        if (firstIntersection > 0 && firstIntersection < 1) boundaries.push(firstIntersection)
        if (secondIntersection > 0 && secondIntersection < 1) boundaries.push(secondIntersection)
      }
    }

    boundaries.sort((firstBoundary, secondBoundary) => firstBoundary - secondBoundary)

    for (let boundaryIndex = 1; boundaryIndex < boundaries.length; boundaryIndex += 1) {
      const start = boundaries[boundaryIndex - 1]
      const end = boundaries[boundaryIndex]
      const midpoint = (start + end) / 2
      const midpointX = first.x + dx * midpoint
      const midpointY = first.y + dy * midpoint
      const outside =
        Math.hypot(midpointX - center.x, midpointY - center.y) >= radius

      if (!outside) {
        finishFragment()
        continue
      }

      if (!currentFragment) currentFragment = []
      appendPoint(currentFragment, first.x + dx * start, first.y + dy * start)
      appendPoint(currentFragment, first.x + dx * end, first.y + dy * end)
    }
  }

  finishFragment()
  return fragments
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ stageRef, color }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const strokesRef = useRef<PaintedStroke[]>([])
    const currentStrokeRef = useRef<PaintedStroke | null>(null)

    const getContext = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.getContext('2d')
    }, [])

    const prepareContext = useCallback((context: CanvasRenderingContext2D, strokeColor: string) => {
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = strokeColor
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
      for (const stroke of strokesRef.current) {
        if (stroke.points.length === 0) continue

        prepareContext(context, stroke.color)
        context.beginPath()
        context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height)
        for (let index = 1; index < stroke.points.length; index += 1) {
          context.lineTo(stroke.points[index].x * width, stroke.points[index].y * height)
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
            stroke = { points: [normalized], color }
            currentStrokeRef.current = stroke
            strokesRef.current.push(stroke)
            return
          }

          const previous = stroke.points[stroke.points.length - 1]
          stroke.points.push(normalized)

          prepareContext(context, stroke.color)
          context.beginPath()
          context.moveTo(previous.x * canvas.clientWidth, previous.y * canvas.clientHeight)
          context.lineTo(normalized.x * canvas.clientWidth, normalized.y * canvas.clientHeight)
          context.stroke()
        },
        eraseAt(point: Point, radius: number) {
          const canvas = canvasRef.current
          if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) return

          currentStrokeRef.current = null
          const effectiveRadius = radius + LINE_WIDTH / 2
          strokesRef.current = strokesRef.current.flatMap((stroke) =>
            splitStrokeOutsideCircle(
              stroke,
              point,
              effectiveRadius,
              canvas.clientWidth,
              canvas.clientHeight,
            ),
          )
          redraw()
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
      [color, getContext, prepareContext, redraw],
    )

    return <canvas ref={canvasRef} className="drawing-canvas" aria-label="에어라이팅 캔버스" />
  },
)
