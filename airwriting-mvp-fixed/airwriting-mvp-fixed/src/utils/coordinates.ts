import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { FacingMode, Point } from '../types'

/**
 * MediaPipe 좌표는 원본 비디오 기준 0~1 값이다.
 * 비디오는 화면에서 object-fit: cover로 크롭되므로 동일한 cover 변환을 적용한다.
 */
export function landmarkToStagePoint(
  landmark: NormalizedLandmark,
  video: HTMLVideoElement,
  stage: HTMLElement,
  facingMode: FacingMode,
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
  const y = sourceY * scale - cropY

  if (facingMode === 'user') {
    x = stageWidth - x
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
