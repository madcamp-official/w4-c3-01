import type { StrokePoint } from '@/types';
import type { AirDrawingDocument } from '@/features/air-drawing/types';

export type CaptureIntent = { kind: 'post' } | { kind: 'lounge'; loungeId: string };

export interface CameraNavState {
  intent?: CaptureIntent;
}

export interface PreviewNavState {
  image: string;
  strokes: StrokePoint[];
  drawing?: AirDrawingDocument;
  intent: CaptureIntent;
  /** Set when reached from a post's "수정하기" menu item instead of a fresh
   * capture — the screen reuses the same layout, but saves a caption edit to
   * the existing post instead of creating a new one. */
  editPostId?: string;
  caption?: string;
}
