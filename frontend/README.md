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

`src/api/*.ts`의 각 함수는 먼저 실제 백엔드 호출을 시도하고, 실패하거나 설정이 비어 있으면 `src/mock/store.ts`의 인메모리 목업으로 폴백합니다. 그래서 지금 당장은 아무 설정 없이 `npm run dev`만으로 전체 플로우가 동작합니다.

- **로그인/회원가입** (`src/api/authApi.ts`)은 [Supabase Auth](https://supabase.com/docs/guides/auth)를 씁니다. 설정 방법은 아래 "Supabase 설정" 참고.
- 그 외 게시물/채팅/라운지/프로필(`src/api/postsApi.ts` 등)은 아직 커스텀 REST 백엔드 자리만 잡아뒀습니다 — `VITE_API_BASE_URL`을 채우면 그쪽으로 요청하고, 비어 있으면 목업으로 동작합니다. 엔드포인트 경로/payload 형태는 각 파일의 `TODO(backend)` 주석 옆에 정리되어 있습니다.

### Supabase 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사해 `.env`에 채웁니다.
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxx
   ```
3. **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 그대로 실행합니다. 이 스크립트가 만드는 것:
   - `profiles` 테이블 — 아이디/닉네임/아바타 색/하트 이미지 등 앱 전용 데이터 (Supabase `auth.users`에는 email/password만 있어서 분리했습니다).
   - 회원가입 시 `auth.users`에 유저가 생기면 `profiles` 행을 자동으로 만들어주는 트리거.
   - "아이디 또는 이메일로 로그인"을 지원하기 위한 `email_for_username` 함수 (username으로 email을 안전하게 조회).
4. **Authentication → Settings → Email Auth**에서 **"Confirm email"을 꺼주세요.** (지금 회원가입 흐름은 가입 즉시 로그인시키는데, 이메일 인증이 켜져 있으면 인증 전까지 로그인 세션이 생기지 않아 바로 로그인이 안 됩니다. 나중에 이메일 인증을 붙이려면 회원가입 화면에 "메일함을 확인하세요" 단계를 추가해야 합니다 — `authApi.signup`이 이미 그 경우를 에러로 던지도록 되어 있습니다.)

로그인 화면은 "아이디 또는 이메일"을 입력받습니다. `@`가 포함되어 있으면 이메일로 바로 로그인 시도하고, 아니면 `email_for_username` RPC로 이메일을 찾아 로그인합니다.

`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`를 비워두면 로그인/회원가입도 그냥 목업 세션으로 동작합니다 (백엔드 없이 화면 확인용).

## 실행

```bash
npm install
cp .env.example .env   # Supabase 등 필요한 값 채우기
npm run dev
```

- `npm run build` — 타입체크 + 프로덕션 빌드
- `npm run lint` — ESLint

## 알려진 제약 / 다음 단계

- 카메라(`getUserMedia`)는 HTTPS 또는 localhost에서만 동작합니다. 실기기 테스트 시 HTTPS 터널(ngrok 등)이 필요합니다.
- Capacitor 래핑은 아직 설정하지 않았습니다. 웹 앱이 안정화된 뒤 `npx cap init` → `npx cap add ios/android`로 진행하면 됩니다.
- 로그인/회원가입 외 나머지 기능(게시물, 채팅, 라운지, 프로필 수정)은 아직 Supabase에 연결되어 있지 않습니다 — 다음 단계로 이어서 붙이면 됩니다.
