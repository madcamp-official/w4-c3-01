import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import type { Point } from '../types'

const COLORS = [
  { name: '흰색', value: '#ffffff' },
  { name: '검정', value: '#17181c' },
  { name: '파랑', value: '#4f91e8' },
  { name: '초록', value: '#7fbd5d' },
  { name: '노랑', value: '#facb58' },
  { name: '주황', value: '#f39243' },
  { name: '빨강', value: '#df5358' },
  { name: '분홍', value: '#c32668' },
  { name: '보라', value: '#9826b9' },
  { name: '하늘', value: '#48c4d8' },
  { name: '연두', value: '#b7dc51' },
  { name: '갈색', value: '#8d5b40' },
]

const AIR_SCROLL_INTERVAL = 360

export interface ColorToolbarHandle {
  handleAirInput: (point: Point | null, pinching: boolean) => boolean
}

interface ColorToolbarProps {
  stageRef: React.RefObject<HTMLDivElement | null>
  selectedColor: string
  onSelectColor: (color: string) => void
}

function containsPoint(rect: DOMRect, clientX: number, clientY: number) {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

export const ColorToolbar = forwardRef<ColorToolbarHandle, ColorToolbarProps>(
  function ColorToolbar({ stageRef, selectedColor, onSelectColor }, ref) {
    const toolbarRef = useRef<HTMLDivElement | null>(null)
    const paletteRef = useRef<HTMLDivElement | null>(null)
    const previousArrowRef = useRef<HTMLButtonElement | null>(null)
    const nextArrowRef = useRef<HTMLButtonElement | null>(null)
    const colorButtonRefs = useRef(new Map<string, HTMLButtonElement>())
    const airPinchingRef = useRef(false)
    const lastAirScrollRef = useRef(0)
    const [airHovered, setAirHovered] = useState<string | null>(null)

    const scrollPalette = useCallback((direction: -1 | 1) => {
      const palette = paletteRef.current
      if (!palette) return

      palette.scrollBy({
        left: direction * Math.max(144, palette.clientWidth * 0.72),
        behavior: 'smooth',
      })
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        handleAirInput(point, pinching) {
          const toolbar = toolbarRef.current
          const stage = stageRef.current
          if (!point || !toolbar || !stage) {
            airPinchingRef.current = pinching
            setAirHovered((current) => (current === null ? current : null))
            return false
          }

          const stageRect = stage.getBoundingClientRect()
          const clientX = stageRect.left + point.x
          const clientY = stageRect.top + point.y
          const insideToolbar = containsPoint(toolbar.getBoundingClientRect(), clientX, clientY)

          if (!insideToolbar) {
            airPinchingRef.current = pinching
            setAirHovered((current) => (current === null ? current : null))
            return false
          }

          const previousArrow = previousArrowRef.current
          const nextArrow = nextArrowRef.current
          let hoveredControl: string | null = null

          if (
            previousArrow &&
            containsPoint(previousArrow.getBoundingClientRect(), clientX, clientY)
          ) {
            hoveredControl = 'previous'
            const now = performance.now()
            if (now - lastAirScrollRef.current >= AIR_SCROLL_INTERVAL) {
              scrollPalette(-1)
              lastAirScrollRef.current = now
            }
          } else if (
            nextArrow &&
            containsPoint(nextArrow.getBoundingClientRect(), clientX, clientY)
          ) {
            hoveredControl = 'next'
            const now = performance.now()
            if (now - lastAirScrollRef.current >= AIR_SCROLL_INTERVAL) {
              scrollPalette(1)
              lastAirScrollRef.current = now
            }
          } else {
            for (const [color, button] of colorButtonRefs.current) {
              if (containsPoint(button.getBoundingClientRect(), clientX, clientY)) {
                hoveredControl = color
                if (pinching && !airPinchingRef.current) onSelectColor(color)
                break
              }
            }
          }

          airPinchingRef.current = pinching
          setAirHovered((current) =>
            current === hoveredControl ? current : hoveredControl,
          )
          return true
        },
      }),
      [onSelectColor, scrollPalette, stageRef],
    )

    return (
      <div ref={toolbarRef} className="color-toolbar" aria-label="펜 색상 선택">
        <button
          ref={previousArrowRef}
          className={`palette-arrow ${airHovered === 'previous' ? 'air-hovered' : ''}`}
          type="button"
          onClick={() => scrollPalette(-1)}
          aria-label="이전 색상 보기"
        >
          ‹
        </button>

        <div ref={paletteRef} className="color-palette">
          {COLORS.map((color) => (
            <button
              key={color.value}
              ref={(element) => {
                if (element) colorButtonRefs.current.set(color.value, element)
                else colorButtonRefs.current.delete(color.value)
              }}
              className={`color-swatch ${
                selectedColor === color.value ? 'selected' : ''
              } ${airHovered === color.value ? 'air-hovered' : ''}`}
              type="button"
              onClick={() => onSelectColor(color.value)}
              aria-label={`${color.name} 펜`}
              aria-pressed={selectedColor === color.value}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>

        <button
          ref={nextArrowRef}
          className={`palette-arrow ${airHovered === 'next' ? 'air-hovered' : ''}`}
          type="button"
          onClick={() => scrollPalette(1)}
          aria-label="다음 색상 보기"
        >
          ›
        </button>
      </div>
    )
  },
)
