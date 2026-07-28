import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { FacingMode, Point } from './types'

/**
 * MediaPipe 좌표는 원본 비디오 기준 0~1 값이다.
 * 비디오는 화면에서 object-fit: cover로 크롭되므로 동일한 cover 변환을 적용하고,
 * 그 위에 디지털 줌(CSS transform: scale(zoom), 중심 기준 확대)까지 반영한다 —
 * 이걸 안 하면 줌 중에는 커서가 실제 손가락 위치와 어긋나서 마치 반응이
 * 느리거나 부정확한 것처럼 느껴진다.
 */
export function landmarkToStagePoint(
  landmark: NormalizedLandmark,
  video: HTMLVideoElement,
  stage: HTMLElement,
  facingMode: FacingMode,
  zoom = 1,
): Point | null {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  const stageWidth = stage.clientWidth
  const stageHeight = stage.clientHeight

  if (!videoWidth || !videoHeight || !stageWidth || !stageHeight) {
    return null
  }

  const scale = Math.max(stageWidth / videoWidth, stageHeight / videoHeight)
  const renderedWidth = videoWidth * scale
  const renderedHeight = videoHeight * scale
  const cropX = (renderedWidth - stageWidth) / 2
  const cropY = (renderedHeight - stageHeight) / 2

  const sourceX = landmark.x * videoWidth
  const sourceY = landmark.y * videoHeight

  let x = sourceX * scale - cropX
  let y = sourceY * scale - cropY

  if (facingMode === 'user') {
    x = stageWidth - x
  }

  if (zoom !== 1) {
    // transform-origin defaults to the element's own center (50% 50%).
    x = stageWidth / 2 + (x - stageWidth / 2) * zoom
    y = stageHeight / 2 + (y - stageHeight / 2) * zoom
  }

  return { x, y }
}

export function smoothPoint(previous: Point | null, current: Point, alpha = 0.32): Point {
  if (!previous) return current

  return {
    x: previous.x * (1 - alpha) + current.x * alpha,
    y: previous.y * (1 - alpha) + current.y * alpha,
  }
}
