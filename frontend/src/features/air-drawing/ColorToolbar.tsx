import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import type { Point } from './types'

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

const COLORS_PER_PAGE = 6

export interface ColorToolbarHandle {
  handleAirInput: (point: Point | null, pinching: boolean, twoFinger: boolean) => boolean
  setOpen: (open: boolean) => void
}

interface ColorToolbarProps {
  stageRef: React.RefObject<HTMLDivElement | null>
  selectedColor: string
  onSelectColor: (color: string) => void
  onRequestOpen?: () => void
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
  function ColorToolbar({ stageRef, selectedColor, onSelectColor, onRequestOpen }, ref) {
    const toolbarRef = useRef<HTMLDivElement | null>(null)
    const toggleRef = useRef<HTMLButtonElement | null>(null)
    const previousArrowRef = useRef<HTMLButtonElement | null>(null)
    const nextArrowRef = useRef<HTMLButtonElement | null>(null)
    const colorButtonRefs = useRef(new Map<string, HTMLButtonElement>())
    const airPinchingRef = useRef(false)
    const swipeStartXRef = useRef<number | null>(null)
    const swipeStartedOpenRef = useRef(false)
    const swipeHandledRef = useRef(false)
    const [airHovered, setAirHovered] = useState<string | null>(null)
    const [page, setPage] = useState(0)
    const [open, setOpen] = useState(false)

    const changePage = useCallback((direction: -1 | 1) => {
      const pageCount = Math.ceil(COLORS.length / COLORS_PER_PAGE)
      setPage((current) => (current + direction + pageCount) % pageCount)
      setAirHovered(null)
    }, [])

    const visibleColors = COLORS.slice(
      page * COLORS_PER_PAGE,
      (page + 1) * COLORS_PER_PAGE,
    )

    useImperativeHandle(
      ref,
      () => ({
        setOpen,
        handleAirInput(point, pinching, twoFinger) {
          const toolbar = toolbarRef.current
          const toggle = toggleRef.current
          const stage = stageRef.current
          if (!point || !toolbar || !toggle || !stage) {
            airPinchingRef.current = pinching
            swipeStartXRef.current = null
            swipeHandledRef.current = false
            setAirHovered((current) => (current === null ? current : null))
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

          if (swipeStartXRef.current === null && insideToggle && twoFinger) {
            swipeStartXRef.current = clientX
            swipeStartedOpenRef.current = open
          }

          if (swipeStartXRef.current !== null) {
            if (!twoFinger) {
              swipeStartXRef.current = null
              airPinchingRef.current = pinching
              setAirHovered(null)
              return insideToggle
            }

            const distance = clientX - swipeStartXRef.current
            const shouldOpen = !swipeStartedOpenRef.current && distance >= 42
            const shouldClose = swipeStartedOpenRef.current && distance <= -42

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
            if (!open) {
              setOpen(true)
              onRequestOpen?.()
            }
            airPinchingRef.current = pinching
            setAirHovered(null)
            return true
          }

          if (!open) {
            airPinchingRef.current = pinching
            setAirHovered(null)
            return false
          }

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
            if (pinching && !airPinchingRef.current) changePage(-1)
          } else if (
            nextArrow &&
            containsPoint(nextArrow.getBoundingClientRect(), clientX, clientY)
          ) {
            hoveredControl = 'next'
            if (pinching && !airPinchingRef.current) changePage(1)
          } else {
            for (const [color, button] of colorButtonRefs.current) {
              if (containsPoint(button.getBoundingClientRect(), clientX, clientY)) {
                hoveredControl = color
                if (selectedColor !== color) onSelectColor(color)
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
      [changePage, onRequestOpen, onSelectColor, open, selectedColor, stageRef],
    )

    return (
      <div className={`side-drawer color-drawer ${open ? 'open' : ''}`}>
        <button
          ref={toggleRef}
          className="drawer-toggle drawer-toggle-left"
          type="button"
          onClick={() => {
            setOpen((current) => {
              if (!current) onRequestOpen?.()
              return !current
            })
          }}
          aria-label={open ? '색상 팔레트 닫기' : '색상 팔레트 열기'}
          aria-expanded={open}
        >
          <span className="drawer-color-icon" style={{ backgroundColor: selectedColor }} />
        </button>

        <div ref={toolbarRef} className="color-toolbar" aria-label="펜 색상 선택">
          <button
            ref={previousArrowRef}
            className={`palette-arrow ${airHovered === 'previous' ? 'air-hovered' : ''}`}
            type="button"
            onClick={() => changePage(-1)}
            aria-label="이전 색상 보기"
          >
            ‹
          </button>

          <div className="color-palette">
            {visibleColors.map((color) => (
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
            onClick={() => changePage(1)}
            aria-label="다음 색상 보기"
          >
            ›
          </button>
        </div>
      </div>
    )
  },
)
