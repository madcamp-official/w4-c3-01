import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import type { AirDrawingDocument, PenTool, Point, Stroke } from './types'

export interface DrawingCanvasHandle {
  addPoint: (point: Point) => void
  eraseAt: (point: Point, radius: number) => void
  endStroke: () => void
  clear: () => void
  hasDrawing: () => boolean
  getCanvas: () => HTMLCanvasElement | null
  getDocument: () => AirDrawingDocument
}

interface DrawingCanvasProps {
  stageRef: React.RefObject<HTMLDivElement | null>
  color: string
  tool: PenTool
  lineSize: number
}

const GEOMETRY_EPSILON = 0.0001

interface PaintedStroke {
  points: Stroke
  color: string
  tool: PenTool
  lineWidth: number
}

const TOOL_STYLES: Record<
  PenTool,
  {
    lineWidth: number
    opacity: number
    lineCap: CanvasLineCap
    dash: number[]
    shadowBlur: number
    glow: boolean
  }
> = {
  pen: {
    lineWidth: 6,
    opacity: 1,
    lineCap: 'round',
    dash: [],
    shadowBlur: 4,
    glow: false,
  },
  highlighter: {
    lineWidth: 18,
    opacity: 0.34,
    lineCap: 'square',
    dash: [],
    shadowBlur: 0,
    glow: false,
  },
  spray: {
    lineWidth: 24,
    opacity: 0.42,
    lineCap: 'round',
    dash: [],
    shadowBlur: 0,
    glow: false,
  },
  dashed: {
    lineWidth: 5,
    opacity: 1,
    lineCap: 'round',
    dash: [12, 9],
    shadowBlur: 2,
    glow: false,
  },
  crayon: {
    lineWidth: 8,
    opacity: 0.68,
    lineCap: 'butt',
    dash: [2.2, 1.4],
    shadowBlur: 0,
    glow: false,
  },
  neon: {
    lineWidth: 5,
    opacity: 1,
    lineCap: 'round',
    dash: [],
    shadowBlur: 16,
    glow: true,
  },
}

function getToolLineWidth(tool: PenTool, lineSize: number) {
  if (tool === 'highlighter') return lineSize * 2.4
  if (tool === 'spray') return lineSize * 3
  if (tool === 'crayon') return lineSize * 1.3
  return lineSize
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function drawSpraySegment(
  context: CanvasRenderingContext2D,
  color: string,
  first: Point,
  second: Point,
  segmentIndex: number,
  sprayWidth: number,
) {
  const dx = second.x - first.x
  const dy = second.y - first.y
  const distance = Math.hypot(dx, dy)
  const steps = Math.max(1, Math.ceil(distance / 4))

  context.save()
  context.globalAlpha = TOOL_STYLES.spray.opacity
  context.shadowBlur = 0
  context.fillStyle = color

  for (let step = 0; step < steps; step += 1) {
    const progress = step / steps
    const centerX = first.x + dx * progress
    const centerY = first.y + dy * progress

    const particleCount = Math.max(4, Math.round(sprayWidth / 5))
    for (let particle = 0; particle < particleCount; particle += 1) {
      const seed = segmentIndex * 1009 + step * 37 + particle * 7
      const angle = seededRandom(seed + 1) * Math.PI * 2
      const radius = Math.sqrt(seededRandom(seed + 2)) * (sprayWidth / 2)
      const size = 0.7 + seededRandom(seed + 3) * 1.2
      context.beginPath()
      context.arc(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
        size,
        0,
        Math.PI * 2,
      )
      context.fill()
    }
  }

  context.restore()
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
      fragments.push({
        points: currentFragment,
        color: paintedStroke.color,
        tool: paintedStroke.tool,
        lineWidth: paintedStroke.lineWidth,
      })
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
  function DrawingCanvas({ stageRef, color, tool, lineSize }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const strokesRef = useRef<PaintedStroke[]>([])
    const currentStrokeRef = useRef<PaintedStroke | null>(null)

    const getContext = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.getContext('2d')
    }, [])

    const prepareContext = useCallback((
      context: CanvasRenderingContext2D,
      strokeColor: string,
      strokeTool: PenTool,
      strokeWidth: number,
    ) => {
      const style = TOOL_STYLES[strokeTool]
      context.globalAlpha = style.opacity
      context.globalCompositeOperation = 'source-over'
      context.lineCap = style.lineCap
      context.lineJoin = 'round'
      context.strokeStyle = strokeColor
      context.lineWidth = strokeWidth
      context.setLineDash(style.dash)
      context.shadowColor = style.glow ? strokeColor : 'rgba(0, 0, 0, 0.35)'
      context.shadowBlur = style.shadowBlur
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

        if (stroke.tool === 'spray') {
          for (let index = 1; index < stroke.points.length; index += 1) {
            drawSpraySegment(
              context,
              stroke.color,
              {
                x: stroke.points[index - 1].x * width,
                y: stroke.points[index - 1].y * height,
              },
              {
                x: stroke.points[index].x * width,
                y: stroke.points[index].y * height,
              },
              index,
              stroke.lineWidth,
            )
          }
          continue
        }

        prepareContext(context, stroke.color, stroke.tool, stroke.lineWidth)
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
            stroke = {
              points: [normalized],
              color,
              tool,
              lineWidth: getToolLineWidth(tool, lineSize),
            }
            currentStrokeRef.current = stroke
            strokesRef.current.push(stroke)
            return
          }

          const previous = stroke.points[stroke.points.length - 1]
          stroke.points.push(normalized)

          if (stroke.tool === 'spray') {
            drawSpraySegment(
              context,
              stroke.color,
              {
                x: previous.x * canvas.clientWidth,
                y: previous.y * canvas.clientHeight,
              },
              {
                x: normalized.x * canvas.clientWidth,
                y: normalized.y * canvas.clientHeight,
              },
              stroke.points.length - 1,
              stroke.lineWidth,
            )
            return
          }

          prepareContext(context, stroke.color, stroke.tool, stroke.lineWidth)
          context.beginPath()
          context.moveTo(previous.x * canvas.clientWidth, previous.y * canvas.clientHeight)
          context.lineTo(normalized.x * canvas.clientWidth, normalized.y * canvas.clientHeight)
          context.stroke()
        },
        eraseAt(point: Point, radius: number) {
          const canvas = canvasRef.current
          if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) return

          currentStrokeRef.current = null
          const widestStroke = strokesRef.current.reduce(
            (maximum, stroke) => Math.max(maximum, stroke.lineWidth),
            getToolLineWidth(tool, lineSize),
          )
          const effectiveRadius = radius + widestStroke / 2
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
            context.globalAlpha = 1
            context.setLineDash([])
            context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
          }
        },
        hasDrawing() {
          return strokesRef.current.some((stroke) => stroke.points.length > 1)
        },
        getCanvas() {
          return canvasRef.current
        },
        getDocument() {
          return {
            version: 2,
            strokes: strokesRef.current.map((stroke) => ({
              points: stroke.points.map((point) => ({ ...point })),
              color: stroke.color,
              tool: stroke.tool,
              lineWidth: stroke.lineWidth,
            })),
          }
        },
      }),
      [color, getContext, lineSize, prepareContext, redraw, tool],
    )

    return <canvas ref={canvasRef} className="drawing-canvas" aria-label="에어라이팅 캔버스" />
  },
)
