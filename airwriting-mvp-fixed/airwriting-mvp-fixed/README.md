# Airwriting MVP — 로컬 모델 버전

카메라 영상에서 검지 끝을 추적하고, 손가락 이동 경로를 화면 위에 실시간으로 그리는 React 웹 MVP입니다.

이번 버전은 브라우저가 jsDelivr 또는 Google Storage에 직접 접근하다 실패하는 문제를 피하기 위해 다음 파일을 **로컬 프로젝트에서 제공**합니다.

- MediaPipe WASM: `public/wasm`
- Hand Landmarker 모델: `public/models/hand_landmarker.task`

## 처음 실행

PowerShell에서 프로젝트 폴더로 이동한 뒤 실행합니다.

```powershell
npm install
npm run dev
```

`npm run dev` 전에 자동으로 다음 작업이 실행됩니다.

1. `node_modules/@mediapipe/tasks-vision/wasm`의 파일을 `public/wasm`으로 복사
2. 손 인식 모델을 `public/models/hand_landmarker.task`로 한 번만 다운로드

이후 브라우저는 외부 CDN이 아닌 `localhost`에서 WASM과 모델을 읽습니다.

## 모델 자동 다운로드가 실패할 때

PowerShell에서 아래 명령을 실행합니다.

```powershell
New-Item -ItemType Directory -Force public\models
Invoke-WebRequest `
  -Uri "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" `
  -OutFile "public\models\hand_landmarker.task"
```

그다음 다시 실행합니다.

```powershell
npm run dev
```

## 기존 설치에서 교체한 경우

의존성 버전을 맞추기 위해 한 번 정리한 뒤 다시 설치하는 것을 권장합니다.

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npm run dev
```

## 정상 동작 확인

브라우저 개발자 도구의 Network 탭에서 다음 요청이 `200`이어야 합니다.

- `/wasm/vision_wasm_internal.js` 또는 SIMD 버전
- `/wasm/vision_wasm_internal.wasm` 또는 SIMD 버전
- `/models/hand_landmarker.task`

## 포함 기능

- 전면 카메라 기본 실행
- 전면/후면 카메라 전환
- MediaPipe Hand Landmarker 기반 한 손 추적
- 검지 끝 위치 표시
- 그리기 시작/중지
- 전체 지우기
- 전면 카메라 미러링 및 `object-fit: cover` 좌표 보정
- 화면 회전 및 리사이즈 대응

이미지 저장과 3D/AR 공간 고정은 포함하지 않습니다.
