export type FacingMode = 'user' | 'environment'

export type AppStatus =
  | '카메라 대기'
  | '모델 불러오는 중'
  | '손 찾는 중'
  | '손 인식됨'
  | '그리는 중'
  | '그리기 중지'
  | '오류 발생'

export interface Point {
  x: number
  y: number
}

export interface NormalizedPoint {
  x: number
  y: number
}

export type Stroke = NormalizedPoint[]
