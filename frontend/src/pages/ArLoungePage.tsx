import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import * as THREE from 'three';
import '@/styles/ar-lounge.css';

type PointTuple = [number, number, number];
type SharedStroke = {
  id: string;
  loungeId: string;
  userId: string;
  color: string;
  widthMm: number;
  points: PointTuple[];
};

const COLORS = ['#8ef0d0', '#ffd85e', '#f27b9f', '#ffffff'];
const ORIGIN_DISTANCE = 0.6;
const PEN_DISTANCE = 0.28;
const QR_SIZE = 0.15;
const MIN_POINT_DISTANCE = 0.008;

function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

export default function ArLoungePage() {
  const { loungeId = 'lounge-1' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const originRef = useRef<THREE.Group | null>(null);
  const cameraPositionRef = useRef(new THREE.Vector3());
  const cameraQuaternionRef = useRef(new THREE.Quaternion());
  const cameraReadyRef = useRef(false);
  const originReadyRef = useRef(false);
  const drawingRef = useRef(false);
  const activeGroupRef = useRef<THREE.Group | null>(null);
  const activeStrokeRef = useRef<SharedStroke | null>(null);
  const previousPointRef = useRef<THREE.Vector3 | null>(null);
  const groupsRef = useRef(new Map<string, THREE.Group>());
  const strokesRef = useRef(new Map<string, SharedStroke>());
  const localIdsRef = useRef<string[]>([]);
  const colorRef = useRef(COLORS[0]);
  const widthRef = useRef(14);
  const userIdRef = useRef(
    sessionStorage.getItem('ar-lounge-user') || `guest-${crypto.randomUUID().slice(0, 8)}`
  );

  const initialServer =
    searchParams.get('server') ||
    localStorage.getItem('ar-lounge-server') ||
    (location.protocol === 'http:' ? `http://${location.hostname}:8787` : '');

  const [serverUrl, setServerUrl] = useState(initialServer);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [inAr, setInAr] = useState(false);
  const [aligning, setAligning] = useState(true);
  const [originReady, setOriginReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [widthMm, setWidthMm] = useState(14);
  const [onlineCount, setOnlineCount] = useState(0);
  const [syncState, setSyncState] = useState<'offline' | 'connecting' | 'connected' | 'error'>('offline');
  const [strokeCount, setStrokeCount] = useState(0);
  const [message, setMessage] = useState('AR 지원 여부를 확인하고 있어요.');

  useEffect(() => {
    sessionStorage.setItem('ar-lounge-user', userIdRef.current);
    colorRef.current = color;
    widthRef.current = widthMm;
  }, [color, widthMm]);

  useEffect(() => {
    let active = true;
    if (!navigator.xr) {
      setSupported(false);
      setMessage('ARCore를 지원하는 Android Chrome에서 열어주세요.');
      return;
    }
    navigator.xr.isSessionSupported('immersive-ar').then((result) => {
      if (!active) return;
      setSupported(result);
      setMessage(result ? '라운지 AR을 시작할 수 있어요.' : '이 기기는 WebXR AR을 지원하지 않아요.');
    });
    return () => {
      active = false;
    };
  }, []);

  const addSegment = useCallback(
    (group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3, strokeColor: string, strokeWidth: number) => {
      const direction = new THREE.Vector3().subVectors(to, from);
      const length = direction.length();
      if (length < MIN_POINT_DISTANCE) return;
      const radius = strokeWidth / 2000;
      const material = new THREE.MeshBasicMaterial({ color: strokeColor });
      const segment = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, length, 12),
        material
      );
      segment.position.copy(from).add(to).multiplyScalar(0.5);
      segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      group.add(segment);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material.clone());
      cap.position.copy(to);
      group.add(cap);
    },
    []
  );

  const removeRendered = useCallback((id: string) => {
    const group = groupsRef.current.get(id);
    if (!group) return;
    originRef.current?.remove(group);
    disposeGroup(group);
    groupsRef.current.delete(id);
    setStrokeCount(groupsRef.current.size);
  }, []);

  const clearRendered = useCallback(() => {
    for (const id of [...groupsRef.current.keys()]) removeRendered(id);
  }, [removeRendered]);

  const renderStroke = useCallback(
    (stroke: SharedStroke) => {
      const origin = originRef.current;
      if (!origin || !originReadyRef.current || groupsRef.current.has(stroke.id) || stroke.points.length < 2) return;
      const group = new THREE.Group();
      group.name = stroke.id;
      const first = new THREE.Vector3(...stroke.points[0]);
      const firstCap = new THREE.Mesh(
        new THREE.SphereGeometry(stroke.widthMm / 2000, 12, 8),
        new THREE.MeshBasicMaterial({ color: stroke.color })
      );
      firstCap.position.copy(first);
      group.add(firstCap);
      for (let index = 1; index < stroke.points.length; index += 1) {
        addSegment(
          group,
          new THREE.Vector3(...stroke.points[index - 1]),
          new THREE.Vector3(...stroke.points[index]),
          stroke.color,
          stroke.widthMm
        );
      }
      origin.add(group);
      groupsRef.current.set(stroke.id, group);
      setStrokeCount(groupsRef.current.size);
    },
    [addSegment]
  );

  const connectSocket = useCallback(() => {
    socketRef.current?.close();
    if (!serverUrl.trim()) {
      setSyncState('error');
      setMessage('동기화 서버 주소를 먼저 입력해주세요.');
      return;
    }

    let url: URL;
    try {
      url = new URL(serverUrl.trim());
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/ws';
      url.search = new URLSearchParams({ loungeId, userId: userIdRef.current }).toString();
    } catch {
      setSyncState('error');
      setMessage('동기화 서버 주소가 올바르지 않아요.');
      return;
    }

    localStorage.setItem('ar-lounge-server', serverUrl.trim());
    setSyncState('connecting');
    const socket = new WebSocket(url);
    socketRef.current = socket;
    socket.onopen = () => setSyncState('connected');
    socket.onerror = () => setSyncState('error');
    socket.onclose = () => {
      if (socketRef.current === socket) setSyncState('offline');
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(String(event.data)) as {
        type: string;
        strokes?: SharedStroke[];
        stroke?: SharedStroke;
        strokeId?: string;
        onlineCount?: number;
      };
      if (typeof data.onlineCount === 'number') setOnlineCount(data.onlineCount);
      if (data.type === 'snapshot' && data.strokes) {
        strokesRef.current = new Map(data.strokes.map((stroke) => [stroke.id, stroke]));
        clearRendered();
        data.strokes.forEach(renderStroke);
      } else if (data.type === 'stroke:created' && data.stroke) {
        strokesRef.current.set(data.stroke.id, data.stroke);
        renderStroke(data.stroke);
      } else if (data.type === 'stroke:deleted' && data.strokeId) {
        strokesRef.current.delete(data.strokeId);
        removeRendered(data.strokeId);
      } else if (data.type === 'lounge:cleared') {
        strokesRef.current.clear();
        localIdsRef.current = [];
        clearRendered();
      }
    };
  }, [clearRendered, loungeId, removeRendered, renderStroke, serverUrl]);

  const setOrigin = useCallback(() => {
    const origin = originRef.current;
    if (!origin || !cameraReadyRef.current) return;
    clearRendered();
    const forward = new THREE.Vector3(0, 0, -ORIGIN_DISTANCE).applyQuaternion(cameraQuaternionRef.current);
    origin.position.copy(cameraPositionRef.current).add(forward);
    origin.quaternion.copy(cameraQuaternionRef.current);
    origin.scale.set(1, 1, 1);
    origin.updateMatrixWorld(true);
    originReadyRef.current = true;
    setOriginReady(true);
    setAligning(false);
    setMessage('공용 원점을 고정했어요. 이제 공간에 그려보세요.');
    strokesRef.current.forEach(renderStroke);
  }, [clearRendered, renderStroke]);

  const handleAlign = useCallback(() => {
    if (originReadyRef.current && !aligning) {
      originReadyRef.current = false;
      setOriginReady(false);
      setAligning(true);
      setMessage('QR의 바깥 테두리를 사각형에 다시 맞춰주세요.');
      return;
    }
    setOrigin();
  }, [aligning, setOrigin]);

  const startDrawing = useCallback(() => {
    if (!originReadyRef.current || !originRef.current) return;
    const id = `${userIdRef.current}-${Date.now()}`;
    const group = new THREE.Group();
    group.name = id;
    originRef.current.add(group);
    groupsRef.current.set(id, group);
    localIdsRef.current.push(id);
    activeGroupRef.current = group;
    activeStrokeRef.current = {
      id,
      loungeId,
      userId: userIdRef.current,
      color: colorRef.current,
      widthMm: widthRef.current,
      points: []
    };
    previousPointRef.current = null;
    drawingRef.current = true;
    setDrawing(true);
    setStrokeCount(groupsRef.current.size);
  }, [loungeId]);

  const stopDrawing = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setDrawing(false);
    const stroke = activeStrokeRef.current;
    activeGroupRef.current = null;
    activeStrokeRef.current = null;
    previousPointRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    strokesRef.current.set(stroke.id, stroke);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'stroke:create', stroke }));
    }
  }, []);

  const undo = useCallback(() => {
    stopDrawing();
    const id = localIdsRef.current.pop();
    if (!id) return;
    strokesRef.current.delete(id);
    removeRendered(id);
    socketRef.current?.send(JSON.stringify({ type: 'stroke:delete', strokeId: id }));
  }, [removeRendered, stopDrawing]);

  const clearLounge = useCallback(() => {
    clearRendered();
    strokesRef.current.clear();
    localIdsRef.current = [];
    socketRef.current?.send(JSON.stringify({ type: 'lounge:clear' }));
  }, [clearRendered]);

  const startAr = useCallback(async () => {
    if (!navigator.xr || !stageRef.current || !overlayRef.current) return;
    connectSocket();
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      stageRef.current.replaceChildren(renderer.domElement);

      const origin = new THREE.Group();
      scene.add(origin);
      originRef.current = origin;

      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['dom-overlay'],
        optionalFeatures: ['local-floor'],
        domOverlay: { root: overlayRef.current }
      });
      sessionRef.current = session;
      await renderer.xr.setSession(session);
      setInAr(true);
      setAligning(true);
      setMessage('QR 바깥 테두리를 사각형에 맞춘 뒤 정렬 완료를 눌러주세요.');

      const cameraPosition = new THREE.Vector3();
      const cameraQuaternion = new THREE.Quaternion();
      const point = new THREE.Vector3();
      const forward = new THREE.Vector3();

      renderer.setAnimationLoop(() => {
        const xrCamera = renderer.xr.getCamera();
        xrCamera.getWorldPosition(cameraPosition);
        xrCamera.getWorldQuaternion(cameraQuaternion);
        cameraPositionRef.current.copy(cameraPosition);
        cameraQuaternionRef.current.copy(cameraQuaternion);
        cameraReadyRef.current = true;

        const projectionCamera =
          xrCamera instanceof THREE.ArrayCamera && xrCamera.cameras[0] ? xrCamera.cameras[0] : xrCamera;
        const guideSize =
          (innerWidth * projectionCamera.projectionMatrix.elements[0] * (QR_SIZE / ORIGIN_DISTANCE)) / 2;
        overlayRef.current?.style.setProperty(
          '--ar-qr-size',
          `${Math.max(130, Math.min(guideSize, innerWidth * 0.7))}px`
        );

        if (drawingRef.current && activeGroupRef.current && activeStrokeRef.current) {
          forward.set(0, 0, -PEN_DISTANCE).applyQuaternion(cameraQuaternion);
          point.copy(cameraPosition).add(forward);
          origin.worldToLocal(point);
          const previous = previousPointRef.current;
          if (!previous) {
            previousPointRef.current = point.clone();
            activeStrokeRef.current.points.push([point.x, point.y, point.z]);
            const cap = new THREE.Mesh(
              new THREE.SphereGeometry(widthRef.current / 2000, 12, 8),
              new THREE.MeshBasicMaterial({ color: colorRef.current })
            );
            cap.position.copy(point);
            activeGroupRef.current.add(cap);
          } else if (previous.distanceTo(point) >= MIN_POINT_DISTANCE) {
            addSegment(activeGroupRef.current, previous, point, colorRef.current, widthRef.current);
            activeStrokeRef.current.points.push([point.x, point.y, point.z]);
            previous.copy(point);
          }
        }
        renderer.render(scene, camera);
      });

      session.addEventListener('end', () => {
        renderer.setAnimationLoop(null);
        clearRendered();
        renderer.dispose();
        renderer.domElement.remove();
        originRef.current = null;
        sessionRef.current = null;
        originReadyRef.current = false;
        cameraReadyRef.current = false;
        socketRef.current?.close();
        socketRef.current = null;
        setInAr(false);
        setOriginReady(false);
        setOnlineCount(0);
        setSyncState('offline');
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AR을 시작하지 못했어요.');
    }
  }, [addSegment, clearRendered, connectSocket]);

  useEffect(
    () => () => {
      socketRef.current?.close();
      if (sessionRef.current) void sessionRef.current.end();
    },
    []
  );

  return (
    <main className={`ar-lounge ${inAr ? 'is-active' : ''}`}>
      <div ref={stageRef} className="ar-lounge__stage" />

      {!inAr && (
        <section className="ar-lounge__landing">
          <button className="ar-lounge__back" onClick={() => navigate(-1)}>← 돌아가기</button>
          <p className="ar-lounge__eyebrow">PUBLIC AR LOUNGE</p>
          <h1>{loungeId}</h1>
          <p>로그인 없이 같은 링크와 QR을 사용하는 사람들이 3D 낙서를 함께 볼 수 있어요.</p>
          <label className="ar-lounge__server">
            <span>로컬 동기화 서버</span>
            <input
              type="url"
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              placeholder="https://xxxx.trycloudflare.com"
            />
          </label>
          <button className="ar-lounge__launch" disabled={!supported || !serverUrl} onClick={() => void startAr()}>
            AR 라운지 시작
          </button>
          <p className="ar-lounge__message">{message}</p>
        </section>
      )}

      <div ref={overlayRef} className={`ar-lounge__overlay ${inAr ? 'is-visible' : ''}`}>
        {inAr && (
          <>
            <header className="ar-lounge__header">
              <div>
                <b>{loungeId}</b>
                <span>{syncState === 'connected' ? `${onlineCount}명 접속` : '서버 연결 중'}</span>
              </div>
              <button onClick={() => void sessionRef.current?.end()} aria-label="AR 종료">×</button>
            </header>

            {aligning && (
              <div className="ar-qr-guide">
                <i className="tl" /><i className="tr" /><i className="bl" /><i className="br" />
                <span>QR 외곽선을 맞추세요</span>
              </div>
            )}

            <section className="ar-lounge__controls">
              <div className="ar-lounge__row">
                <button onClick={handleAlign}>{aligning ? '정렬 완료 · 원점 설정' : 'QR 다시 맞추기'}</button>
                <span>선 {strokeCount}</span>
              </div>
              <p>{message}</p>
              <label className="ar-lounge__width">
                <span>굵기</span>
                <input type="range" min="4" max="24" step="2" value={widthMm} onChange={(event) => setWidthMm(Number(event.target.value))} />
                <output>{widthMm}mm</output>
              </label>
              <div className="ar-lounge__tools">
                {COLORS.map((item) => (
                  <button
                    key={item}
                    className={color === item ? 'selected' : ''}
                    style={{ background: item }}
                    onClick={() => setColor(item)}
                    aria-label={`색상 ${item}`}
                  />
                ))}
                <button className="text" onClick={undo}>되돌리기</button>
                <button className="text" onClick={clearLounge}>전체 삭제</button>
              </div>
              <button
                className={`ar-lounge__draw ${drawing ? 'drawing' : ''}`}
                disabled={!originReady}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  startDrawing();
                }}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
              >
                {drawing ? '누른 채 휴대폰을 움직이세요' : '누르고 이동해 그리기'}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
