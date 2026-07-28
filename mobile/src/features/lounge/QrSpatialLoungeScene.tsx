import {
  ViroAmbientLight,
  ViroARScene,
  ViroMaterials,
  ViroPolyline,
  type ViroCameraTransform,
} from '@reactvision/react-viro';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  SpatialLoungeContent,
  SpatialStrokePoint,
} from '@/features/lounge/spatialTypes';

type Point3 = [number, number, number];

type OriginBasis = {
  origin: Point3;
  right: Point3;
  up: Point3;
  forward: Point3;
};

export type QrSpatialSceneAppProps = {
  contents: SpatialLoungeContent[];
  alignRevision: number;
  drawing: boolean;
  color: string;
  width: number;
  onAligned: () => void;
  onStrokeFinished: (points: SpatialStrokePoint[]) => void;
};

type SceneProps = {
  sceneNavigator?: {
    viroAppProps?: QrSpatialSceneAppProps;
  };
};

const ORIGIN_DISTANCE = 0.6;
const PEN_DISTANCE = 0.28;
const MIN_POINT_DISTANCE = 0.008;
const LEGACY_ARTWORK_WIDTH = 0.42;

ViroMaterials.createMaterials({
  alineInk: { diffuseColor: '#221F1A', lightingModel: 'Constant' },
  alineRed: { diffuseColor: '#B3382E', lightingModel: 'Constant' },
  alineOchre: { diffuseColor: '#C9B48A', lightingModel: 'Constant' },
  alineWhite: { diffuseColor: '#FFFFFF', lightingModel: 'Constant' },
});

function add(a: Point3, b: Point3): Point3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a: Point3, b: Point3): Point3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function multiply(point: Point3, amount: number): Point3 {
  return [point[0] * amount, point[1] * amount, point[2] * amount];
}

function dot(a: Point3, b: Point3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Point3, b: Point3): Point3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(point: Point3): Point3 {
  const length = Math.hypot(point[0], point[1], point[2]);
  if (length < 0.0001) return [0, 0, -1];
  return [point[0] / length, point[1] / length, point[2] / length];
}

function distance(a: SpatialStrokePoint, b: SpatialStrokePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function createBasis(camera: ViroCameraTransform): OriginBasis {
  const position = camera.position as Point3;
  const forward = normalize(camera.forward as Point3);
  let right = normalize(cross(forward, [0, 1, 0]));
  if (Math.abs(dot(forward, [0, 1, 0])) > 0.98) {
    right = normalize(cross(forward, [0, 0, 1]));
  }
  const up = normalize(cross(right, forward));
  return {
    origin: add(position, multiply(forward, ORIGIN_DISTANCE)),
    right,
    up,
    forward,
  };
}

function worldToLocal(point: Point3, basis: OriginBasis): SpatialStrokePoint {
  const relative = subtract(point, basis.origin);
  return {
    x: dot(relative, basis.right),
    y: dot(relative, basis.up),
    z: dot(relative, basis.forward),
  };
}

function localToWorld(point: SpatialStrokePoint, basis: OriginBasis): Point3 {
  return add(
    basis.origin,
    add(
      multiply(basis.right, point.x),
      add(multiply(basis.up, point.y), multiply(basis.forward, point.z ?? 0)),
    ),
  );
}

function materialFor(color: string) {
  const normalized = color.toUpperCase();
  if (normalized === '#B3382E') return 'alineRed';
  if (normalized === '#C9B48A') return 'alineOchre';
  if (normalized === '#FFFFFF') return 'alineWhite';
  return 'alineInk';
}

function contentPoints(content: SpatialLoungeContent, basis: OriginBasis) {
  return content.stroke_data.strokes.map((stroke) => {
    const hasSpatialPoints = stroke.points.some((point) => point.z !== undefined);
    const points = hasSpatialPoints
      ? stroke.points
      : stroke.points.map((point) => ({
          x: (point.x / content.stroke_data.width - 0.5) * LEGACY_ARTWORK_WIDTH,
          y:
            (0.5 - point.y / content.stroke_data.height) *
            LEGACY_ARTWORK_WIDTH *
            (content.stroke_data.height / content.stroke_data.width),
          z: 0,
        }));
    return {
      color: stroke.color,
      width: stroke.width,
      points: points.map((point) => localToWorld(point, basis)),
    };
  });
}

export function QrSpatialLoungeScene({ sceneNavigator }: SceneProps = {}) {
  const props = sceneNavigator?.viroAppProps;
  const [basis, setBasis] = useState<OriginBasis | null>(null);
  const [activePoints, setActivePoints] = useState<SpatialStrokePoint[]>([]);
  const cameraRef = useRef<ViroCameraTransform | null>(null);
  const activePointsRef = useRef<SpatialStrokePoint[]>([]);
  const previousDrawingRef = useRef(false);
  const handledAlignRevisionRef = useRef(0);
  const onAlignedRef = useRef(props?.onAligned);
  const onStrokeFinishedRef = useRef(props?.onStrokeFinished);

  useEffect(() => {
    onAlignedRef.current = props?.onAligned;
    onStrokeFinishedRef.current = props?.onStrokeFinished;
  }, [props?.onAligned, props?.onStrokeFinished]);

  const alignFromCamera = (camera: ViroCameraTransform, revision: number) => {
    if (revision <= handledAlignRevisionRef.current) return;
    handledAlignRevisionRef.current = revision;
    setBasis(createBasis(camera));
    activePointsRef.current = [];
    setActivePoints([]);
    onAlignedRef.current?.();
  };

  useEffect(() => {
    const revision = props?.alignRevision ?? 0;
    if (revision <= handledAlignRevisionRef.current || !cameraRef.current) return;
    alignFromCamera(cameraRef.current, revision);
  }, [props?.alignRevision]);

  useEffect(() => {
    const drawing = props?.drawing ?? false;
    if (drawing && !previousDrawingRef.current) {
      activePointsRef.current = [];
      setActivePoints([]);
    } else if (!drawing && previousDrawingRef.current) {
      const completed = activePointsRef.current;
      if (completed.length > 1) onStrokeFinishedRef.current?.(completed);
      activePointsRef.current = [];
      setActivePoints([]);
    }
    previousDrawingRef.current = drawing;
  }, [props?.drawing]);

  const handleCameraTransform = (camera: ViroCameraTransform) => {
    cameraRef.current = camera;
    const revision = props?.alignRevision ?? 0;
    if (revision > handledAlignRevisionRef.current) {
      alignFromCamera(camera, revision);
      return;
    }
    if (!props?.drawing || !basis) return;

    const cameraPosition = camera.position as Point3;
    const forward = normalize(camera.forward as Point3);
    const penPosition = add(cameraPosition, multiply(forward, PEN_DISTANCE));
    const point = worldToLocal(penPosition, basis);
    const previous = activePointsRef.current.at(-1);
    if (previous && distance(previous, point) < MIN_POINT_DISTANCE) return;

    const next = [...activePointsRef.current, point];
    activePointsRef.current = next;
    setActivePoints(next);
  };

  const renderedContents = useMemo(
    () =>
      basis
        ? (props?.contents ?? []).flatMap((content) =>
            contentPoints(content, basis).map((stroke, index) => ({
              ...stroke,
              key: `${content.content_id}-${index}`,
            })),
          )
        : [],
    [basis, props?.contents],
  );

  return (
    <ViroARScene onCameraTransformUpdate={handleCameraTransform}>
      <ViroAmbientLight color="#FFFFFF" intensity={600} />
      {renderedContents.map((stroke) => (
        <ViroPolyline
          key={stroke.key}
          materials={[materialFor(stroke.color)]}
          points={stroke.points}
          thickness={Math.max(0.004, Math.min(0.02, stroke.width * 0.001))}
        />
      ))}
      {basis && activePoints.length > 1 && (
        <ViroPolyline
          materials={[materialFor(props?.color ?? '#221F1A')]}
          points={activePoints.map((point) => localToWorld(point, basis))}
          thickness={Math.max(0.004, Math.min(0.02, (props?.width ?? 8) * 0.001))}
        />
      )}
    </ViroARScene>
  );
}
