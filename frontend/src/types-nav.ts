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
}
