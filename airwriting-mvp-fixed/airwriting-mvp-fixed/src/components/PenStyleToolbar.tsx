import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { PenTool, Point } from '../types'

const PEN_STYLES = [
  { name: '펜', tool: 'pen' as const, icon: 'pen' },
  { name: '형광펜', tool: 'highlighter' as const, icon: 'highlighter' },
  { name: '스프레이', tool: 'spray' as const, icon: 'spray' },
  { name: '점선', tool: 'dashed' as const, icon: 'dashed' },
  { name: '크레용', tool: 'crayon' as const, icon: 'crayon' },
  { name: '네온', tool: 'neon' as const, icon: 'neon' },
] satisfies Array<{ name: string; tool: PenTool; icon: string }>

export interface PenStyleToolbarHandle {
  handleAirInput: (point: Point | null, pinching: boolean) => boolean
}

interface PenStyleToolbarProps {
  stageRef: React.RefObject<HTMLDivElement | null>
  selectedTool: PenTool
  onSelectTool: (tool: PenTool) => void
  lineSize: number
  onSelectLineSize: (size: number) => void
}

function containsPoint(rect: DOMRect, clientX: number, clientY: number) {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

export const PenStyleToolbar = forwardRef<PenStyleToolbarHandle, PenStyleToolbarProps>(
  function PenStyleToolbar({
    stageRef,
    selectedTool,
    onSelectTool,
    lineSize,
    onSelectLineSize,
  }, ref) {
    const toolbarRef = useRef<HTMLDivElement | null>(null)
    const toggleRef = useRef<HTMLButtonElement | null>(null)
    const sizeTrackRef = useRef<HTMLInputElement | null>(null)
    const buttonRefs = useRef(new Map<PenTool, HTMLButtonElement>())
    const airPinchingRef = useRef(false)
    const swipeStartXRef = useRef<number | null>(null)
    const swipeStartedOpenRef = useRef(false)
    const swipeHandledRef = useRef(false)
    const [open, setOpen] = useState(false)
    const [airHovered, setAirHovered] = useState<PenTool | 'size' | null>(null)

    useImperativeHandle(
      ref,
      () => ({
        handleAirInput(point, pinching) {
          const toolbar = toolbarRef.current
          const toggle = toggleRef.current
          const stage = stageRef.current
          if (!point || !toolbar || !toggle || !stage) {
            airPinchingRef.current = pinching
            swipeStartXRef.current = null
            swipeHandledRef.current = false
            setAirHovered(null)
            return false
          }

          const stageRect = stage.getBoundingClientRect()
          const clientX = stageRect.left + point.x
          const clientY = stageRect.top + point.y
          const insideToggle = containsPoint(
            toggle.getBoundingClientRect(),
            clientX,
            clientY,
          )

          if (swipeHandledRef.current) {
            const stillNearDrawer =
              insideToggle ||
              (open && containsPoint(toolbar.getBoundingClientRect(), clientX, clientY))
            if (!stillNearDrawer) swipeHandledRef.current = false
            airPinchingRef.current = pinching
            return stillNearDrawer
          }

          if (swipeStartXRef.current === null && insideToggle) {
            swipeStartXRef.current = clientX
            swipeStartedOpenRef.current = open
          }

          if (swipeStartXRef.current !== null) {
            const distance = clientX - swipeStartXRef.current
            const shouldOpen = !swipeStartedOpenRef.current && distance <= -42
            const shouldClose = swipeStartedOpenRef.current && distance >= 42

            if (shouldOpen || shouldClose) {
              setOpen(shouldOpen)
              swipeStartXRef.current = null
              swipeHandledRef.current = true
            } else if (Math.abs(distance) > 90) {
              swipeStartXRef.current = null
            }

            airPinchingRef.current = pinching
            setAirHovered(null)
            return true
          }

          if (insideToggle) {
            airPinchingRef.current = pinching
            setAirHovered(null)
            return true
          }

          if (!open) {
            airPinchingRef.current = pinching
            setAirHovered(null)
            return false
          }

          if (!containsPoint(toolbar.getBoundingClientRect(), clientX, clientY)) {
            airPinchingRef.current = pinching
            setAirHovered(null)
            return false
          }

          const sizeTrack = sizeTrackRef.current
          if (sizeTrack && containsPoint(sizeTrack.getBoundingClientRect(), clientX, clientY)) {
            const trackRect = sizeTrack.getBoundingClientRect()
            const ratio = Math.min(
              1,
              Math.max(0, 1 - (clientY - trackRect.top) / trackRect.height),
            )
            onSelectLineSize(Math.round(2 + ratio * 22))
            airPinchingRef.current = pinching
            setAirHovered('size')
            return true
          }

          let hoveredTool: PenTool | null = null
          for (const [tool, button] of buttonRefs.current) {
            if (containsPoint(button.getBoundingClientRect(), clientX, clientY)) {
              hoveredTool = tool
              if (selectedTool !== tool) onSelectTool(tool)
              break
            }
          }

          airPinchingRef.current = pinching
          setAirHovered(hoveredTool)
          return true
        },
      }),
      [onSelectLineSize, onSelectTool, open, selectedTool, stageRef],
    )

    return (
      <div
        className={`side-drawer pen-drawer ${open ? 'open' : ''}`}
      >
        <button
          ref={toggleRef}
          className="drawer-toggle drawer-toggle-right"
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? '펜 스타일 닫기' : '펜 스타일 열기'}
          aria-expanded={open}
        >
          <span className="drawer-pen-icon" aria-hidden="true" />
        </button>

        <div ref={toolbarRef} className="pen-style-toolbar" aria-label="펜 스타일 선택">
          {PEN_STYLES.map((style) => (
            <button
              key={style.tool}
              ref={(element) => {
                if (element) buttonRefs.current.set(style.tool, element)
                else buttonRefs.current.delete(style.tool)
              }}
              className={`pen-style-button ${
                selectedTool === style.tool ? 'selected' : ''
              } ${airHovered === style.tool ? 'air-hovered' : ''}`}
              type="button"
              onClick={() => onSelectTool(style.tool)}
              aria-label={style.name}
              aria-pressed={selectedTool === style.tool}
            >
              <span className={`pen-tool-icon ${style.icon}`} aria-hidden="true" />
              <span className="pen-style-label">{style.name}</span>
            </button>
          ))}

          <label className={`line-size-control ${airHovered === 'size' ? 'air-hovered' : ''}`}>
            <span className="line-size-header">
              <span>선 크기</span>
              <output>{lineSize}</output>
            </span>
            <input
              ref={sizeTrackRef}
              type="range"
              min="2"
              max="24"
              step="1"
              value={lineSize}
              onChange={(event) => onSelectLineSize(Number(event.target.value))}
              aria-label="선 크기"
            />
          </label>
        </div>
      </div>
    )
  },
)
