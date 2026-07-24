import type { StrokePoint } from '@/types';

export type CaptureIntent = { kind: 'post' } | { kind: 'lounge'; loungeId: string };

export interface CameraNavState {
  intent?: CaptureIntent;
}

export interface PreviewNavState {
  image: string;
  strokes: StrokePoint[];
  intent: CaptureIntent;
}
