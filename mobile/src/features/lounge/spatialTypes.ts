export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type Quaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type SpatialTransform = {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
};

export type SpatialStrokePoint = {
  x: number;
  y: number;
  z?: number;
};

export type SpatialStroke = {
  color: string;
  width: number;
  points: SpatialStrokePoint[];
};

export type SpatialStrokeData = {
  version: 1;
  width: number;
  height: number;
  strokes: SpatialStroke[];
};

export type SpatialLoungeContent = {
  lounge_id: string;
  content_id: string;
  user_id: string;
  user_name: string;
  transform: SpatialTransform;
  stroke_data: SpatialStrokeData;
  surface: 'wall' | 'floor' | 'air';
  created_at: string;
};

export type SpatialLounge = {
  id: string;
  name: string;
  location: string;
  description: string;
  accent: string;
};
