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

- **로그인/회원가입** (`src/api/authApi.ts`)과 **채팅** (`src/api/chatApi.ts`)은 [Supabase](https://supabase.com/docs)(Auth + Postgres + Realtime + Storage)를 씁니다. 설정 방법은 아래 "Supabase 설정" 참고.
- 그 외 게시물/라운지/프로필(`src/api/postsApi.ts` 등)은 아직 커스텀 REST 백엔드 자리만 잡아뒀습니다 — `VITE_API_BASE_URL`을 채우면 그쪽으로 요청하고, 비어 있으면 목업으로 동작합니다. 엔드포인트 경로/payload 형태는 각 파일의 `TODO(backend)` 주석 옆에 정리되어 있습니다.

### Supabase 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사해 `.env`에 채웁니다.
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxx
   ```
3. **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 그대로 실행합니다 (여러 번 실행해도 안전합니다). 이 스크립트가 만드는 것:
   - `profiles` 테이블 — 아이디/닉네임/아바타 색/하트 이미지 등 앱 전용 데이터 (Supabase `auth.users`에는 email/password만 있어서 분리했습니다).
   - 회원가입 시 `auth.users`에 유저가 생기면 `profiles` 행을 자동으로 만들어주는 트리거.
   - "아이디 또는 이메일로 로그인"을 지원하기 위한 `email_for_username` 함수 (username으로 email을 안전하게 조회).
   - `conversations`/`messages` 테이블과 RLS — 1:1 채팅. 대화방은 참여자 두 명만 보고 쓸 수 있습니다.
   - `messages` 테이블을 Realtime publication에 등록 — 채팅방을 열어두면 상대방 메시지가 새로고침 없이 바로 뜹니다.
   - `chat-images`라는 공개(public) Storage 버킷 — 허공 손글씨 메시지 이미지를 저장합니다. 업로드는 로그인한 사용자가 자기 uid 폴더 아래에만 가능하도록 제한했습니다.
   - `follows` 테이블과 RLS — 팔로우 관계. 팔로워/팔로잉 수는 저장해두지 않고 이 테이블에서 그때그때 세서 보여줍니다.
4. **Authentication → Settings → Email Auth**에서 **"Confirm email"을 꺼주세요.** (지금 회원가입 흐름은 가입 즉시 로그인시키는데, 이메일 인증이 켜져 있으면 인증 전까지 로그인 세션이 생기지 않아 바로 로그인이 안 됩니다. 나중에 이메일 인증을 붙이려면 회원가입 화면에 "메일함을 확인하세요" 단계를 추가해야 합니다 — `authApi.signup`이 이미 그 경우를 에러로 던지도록 되어 있습니다.)
5. (확인용) **Database → Publications**에서 `supabase_realtime` publication에 `messages` 테이블이 포함돼 있는지 한 번 봐주세요 (`supabase_realtime_messages_publication`이라는 비슷한 이름의 항목은 Supabase 내부용이라 무관합니다). `schema.sql`이 자동으로 등록하긴 하지만, 프로젝트에 따라 안 붙는 경우가 있습니다.

로그인 화면은 "아이디 또는 이메일"을 입력받습니다. `@`가 포함되어 있으면 이메일로 바로 로그인 시도하고, 아니면 `email_for_username` RPC로 이메일을 찾아 로그인합니다.

`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`를 비워두면 로그인/회원가입/채팅 전부 목업 데이터로 동작합니다 (단, 목업 모드에서는 검색에서 새 대화를 시작할 수는 없어요 — 실제 유저 id가 없어서요).

### 채팅 데이터 흐름

- 대화방은 두 사람의 id를 사전순으로 정렬해 `user_a < user_b`로 저장합니다 — 누가 먼저 시작하든 같은 대화방 하나만 생기도록요 (`chatApi.findOrCreateConversation`).
- 검색(`SearchPage`)에서 실제 `profiles`를 검색해 유저를 탭하면 대화방을 찾거나 새로 만들고 그 채팅방으로 이동합니다.
- 채팅방을 열면(`ChatThreadPage`) 전체 메시지를 불러오고(`loadThread`), 동시에 그 대화방의 `messages` INSERT 이벤트를 실시간 구독합니다(`subscribeToThread`). 내가 보낸 메시지는 전송 즉시 화면에 반영되고, 실시간 구독으로 같은 메시지가 다시 들어오면 id로 중복을 걸러냅니다.
- 허공 손글씨 메시지는 캡처한 PNG를 `chat-images` 버킷에 업로드하고, 그 공개 URL만 `messages.image_url`에 저장합니다.

### 검색 · 프로필 · 팔로우

- 검색 화면은 검색어를 입력하기 전에는 아무것도 보여주지 않습니다. 검색어가 있을 때만 `profiles`/게시물을 조회합니다.
- 검색 결과에서 유저를 탭하면 채팅이 아니라 그 사람의 프로필 화면(`/users/:userId`)으로 이동합니다. 본인 id면 `/mypage`로 리다이렉트됩니다.
- 다른 사람 프로필에는 **팔로우/팔로잉** 토글 버튼과 **채팅하기** 버튼이 있습니다. 채팅하기는 대화방을 찾거나 새로 만들어 그 채팅방으로 이동합니다 (`chatApi.findOrCreateConversation`과 동일한 로직).
- 팔로워/팔로잉 수는 `follows` 테이블을 그때그때 세서 보여줍니다 (`followApi.fetchFollowCounts`) — `profiles.followers`/`following` 컬럼은 스키마에는 남아있지만 더는 읽거나 쓰지 않습니다.
- 프로필의 게시물 수는 지금 이 브라우저에 이미 불러와져 있는 피드(`posts`)에서 닉네임이 일치하는 것만 셉니다 — 게시물 자체가 아직 Supabase에 연결되어 있지 않아서(각 사용자 세션에만 존재하는 목업 데이터), 다른 사람이 실제로 올린 게시물 수를 정확히 조회할 방법이 아직 없습니다. 게시물을 Supabase로 옮기면 `author_id`로 정확히 세도록 바꾸면 됩니다.

### 프로필 사진

- 회원가입 2단계와 마이페이지 "프로필 수정"에서 사진을 고르면, 정사각형으로 잘라 320px로 축소한 뒤 JPEG data URL로 만들어 `profiles.avatar_url`에 그대로 저장합니다 (`src/lib/imageFile.ts`) — 하트 그림(`heart_url`)과 같은 방식입니다.
- Storage 버킷을 따로 안 쓰는 이유: 회원가입 시점엔 아직 로그인 세션이 없어서 uid 기반 Storage 업로드가 불가능한데(채팅 이미지는 로그인 후에만 보내니까 문제없음), 회원가입/수정 두 군데서 같은 로직을 쓰려고 통일했습니다. 사진을 원본 화질로 보관하거나 여러 장 올리는 기능이 필요해지면 그때 Storage로 옮기는 게 낫습니다.
- 사진을 등록하지 않으면 기존처럼 닉네임 첫 글자 + 색상 원으로 보여줍니다 (`Avatar` 컴포넌트가 `avatarUrl` 유무로 분기).

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
- 로그인/회원가입/채팅/팔로우/프로필 사진 외 나머지 기능(게시물, 라운지)은 아직 Supabase에 연결되어 있지 않습니다 — 다음 단계로 이어서 붙이면 됩니다.
- 채팅방 목록(`ChatListPage`)은 실시간으로 갱신되지 않습니다 — 새 메시지 미리보기를 보려면 채팅 목록 화면을 다시 들어가야 합니다. 열려있는 채팅방 안에서는 실시간으로 반영됩니다.
