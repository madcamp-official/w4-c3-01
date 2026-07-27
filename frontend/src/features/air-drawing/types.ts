export type FacingMode = 'user' | 'environment'

export type PenTool =
  | 'pen'
  | 'highlighter'
  | 'spray'
  | 'dashed'
  | 'crayon'
  | 'neon'

export type AppStatus =
  | '카메라 대기'
  | '모델 불러오는 중'
  | '손 찾는 중'
  | '손 인식됨'
  | '그리는 중'
  | '지우는 중'
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

export interface AirDrawingStroke {
  points: Stroke
  color: string
  tool: PenTool
  lineWidth: number
}

export interface AirDrawingDocument {
  version: 2
  strokes: AirDrawingStroke[]
}
