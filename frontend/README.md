# 손끝 프론트엔드

`sonkkeut-sketch-prototype (1).html` 정적 프로토타입을 실제 개발용 프론트엔드 코드로 옮긴 버전입니다.

## 스택

- **React 18 + TypeScript + Vite** — 최종적으로 [Capacitor](https://capacitorjs.com/)로 감싸 iOS/Android 앱 스토어에 배포하는 것을 염두에 두고 선택했습니다. 웹 기술(Canvas, `getUserMedia`)을 그대로 쓰는 하이브리드 앱 경로라, 프로토타입의 손하트 그리기·허공 손글씨 캔버스 로직을 거의 그대로 재사용할 수 있습니다. React Native로 바로 가면 캔버스/카메라 코드를 전부 새로 짜야 해서 제외했습니다.
- **React Router (HashRouter)** — 화면마다 실제 URL 경로를 가집니다. `HashRouter`를 쓴 이유는 Capacitor로 패키징했을 때(로컬 파일에서 서빙되는 WebView) 서버 사이드 라우팅 설정 없이도 새로고침/딥링크가 깨지지 않기 때문입니다.
- **CSS는 원본 프로토타입을 거의 1:1로 이식** (`src/styles/global.css`) — sketchy 필터, 폰트, 색상 토큰을 그대로 유지했습니다.

## 폴더 구조

```
src/
  api/          # 도메인별 서비스 함수 (auth, posts, chat, lounge, user)
  mock/         # 백엔드가 없을 때 쓰는 인메모리 목업 스토어 + 시드 데이터
  components/   # 공용 UI (Avatar, BottomNav, 오버레이/시트, 캔버스 컴포넌트 등)
  hooks/        # useCamera, useTrailCanvas 등 캔버스/카메라 훅
  lib/canvas.ts # 하트 곡선, 잉크 스트로크 렌더링 등 순수 캔버스 유틸
  pages/        # 화면 단위 컴포넌트 (프로토타입의 각 <section id="screen-...">에 대응)
  state/        # React Context (세션/피드/채팅/라운지, 오버레이, 배치 플로우, 토스트)
  types.ts      # 도메인 타입
```

## API 연동

`src/api/*.ts`의 각 함수는 먼저 `VITE_API_BASE_URL`로 실제 백엔드를 호출을 시도하고, 실패하거나 base URL이 비어 있으면 `src/mock/store.ts`의 인메모리 목업으로 폴백합니다. 즉:

- 지금 당장은 백엔드 없이 `npm run dev`만으로 전체 플로우가 동작합니다.
- 백엔드가 준비되면 `.env`에 `VITE_API_BASE_URL`만 채우면 됩니다 (엔드포인트 경로/payload 형태는 각 `src/api/*.ts` 파일의 `TODO(backend)` 주석 옆에 정리되어 있습니다).

## 실행

```bash
npm install
cp .env.example .env   # 필요 시 VITE_API_BASE_URL 채우기
npm run dev
```

- `npm run build` — 타입체크 + 프로덕션 빌드
- `npm run lint` — ESLint

## 알려진 제약 / 다음 단계

- 카메라(`getUserMedia`)는 HTTPS 또는 localhost에서만 동작합니다. 실기기 테스트 시 HTTPS 터널(ngrok 등)이 필요합니다.
- Capacitor 래핑은 아직 설정하지 않았습니다. 웹 앱이 안정화된 뒤 `npx cap init` → `npx cap add ios/android`로 진행하면 됩니다.
