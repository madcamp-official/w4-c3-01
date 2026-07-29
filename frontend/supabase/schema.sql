-- 손끝 Supabase 스키마: 로그인/회원가입 + 채팅(+읽음 표시) + 팔로우 + 게시물.
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요. (여러 번 실행해도 안전합니다.)

-- 1) 프로필 테이블: auth.users 는 email/password 만 가지고 있어서,
--    아이디/닉네임/하트 이미지 등 앱 전용 데이터는 여기에 따로 둡니다.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  nickname text not null,
  avatar_color text not null default '#EAE2C9',
  heart_url text,
  avatar_url text,
  followers integer not null default 0,
  following integer not null default 0,
  onboarded boolean not null default true,
  created_at timestamptz not null default now()
);

-- 기존에 이미 만든 프로젝트라면 컬럼만 추가로 붙여줍니다.
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists onboarded boolean not null default true;

alter table public.profiles enable row level security;

-- 피드/검색에서 다른 사람 프로필도 보여야 하므로 조회는 전체 공개.
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- 본인 프로필만 수정 가능 (하트 다시 그리기 등).
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- "Automatically expose new tables"를 꺼둔 프로젝트에서는 RLS 정책과 별개로
-- Data API 역할(anon/authenticated)에 테이블 접근 권한을 직접 줘야 합니다.
-- (실제로 어떤 행을 볼 수 있는지는 위 RLS 정책이 계속 걸러줍니다.)
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;

-- 2) 회원가입 시 auth.users 에 행이 생기면 profiles 행을 자동으로 만들어주는 트리거.
--    이메일/비밀번호 회원가입은 signUp() 의 options.data 로 넘긴 값(raw_user_meta_data)을
--    그대로 씁니다. Google 같은 OAuth 로그인은 username이 없으므로(이메일 앞부분으로
--    자동 생성하고 onboarded = false로 표시해서, 로그인 직후 "프로필 완성" 화면에서
--    확인/수정하게 합니다 — 이 트리거는 email/OAuth 두 경우를 모두 처리합니다.
--    이메일 인증(Confirm email)이 켜져 있어도, 트리거는 회원가입 시점에 바로 실행됩니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provided_username text := new.raw_user_meta_data ->> 'username';
  base_username text;
  candidate text;
  suffix int := 0;
begin
  if provided_username is not null and provided_username <> '' then
    candidate := provided_username;
  else
    base_username := regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_.]', '', 'g');
    if base_username = '' then
      base_username := 'user';
    end if;
    candidate := base_username;
    while exists (select 1 from public.profiles where username = candidate) loop
      suffix := suffix + 1;
      candidate := base_username || suffix::text;
    end loop;
  end if;

  insert into public.profiles (id, username, nickname, avatar_color, heart_url, avatar_url, onboarded)
  values (
    new.id,
    candidate,
    coalesce(
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      candidate
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#EAE2C9'),
    new.raw_user_meta_data ->> 'heart_url',
    new.raw_user_meta_data ->> 'avatar_url',
    (provided_username is not null and provided_username <> '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) "아이디 또는 이메일" 로그인을 지원하기 위한 조회 함수.
--    auth.users.email 은 클라이언트에서 직접 조회할 수 없으므로,
--    SECURITY DEFINER 함수로 username -> email 만 안전하게 돌려줍니다.
create or replace function public.email_for_username(lookup_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = lookup_username
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

-- 4) 채팅: 1:1 대화방 + 메시지 ------------------------------------------
--    user_a < user_b 로 항상 정렬해서 저장하기로 정해서, 두 사람 사이의
--    대화방이 중복 생성되지 않도록 합니다 (프론트에서 항상 정렬해서 조회/생성).
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_ordered check (user_a < user_b),
  constraint conversations_unique unique (user_a, user_b)
);

alter table public.conversations enable row level security;

drop policy if exists "Participants can view their conversations" on public.conversations;
create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "Participants can start a conversation" on public.conversations;
create policy "Participants can start a conversation"
  on public.conversations for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

grant select, insert on public.conversations to authenticated;

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('text', 'air')),
  text text,
  image_url text,
  strokes jsonb,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

grant select, insert on public.messages to authenticated;

-- Realtime이 이 테이블의 INSERT 이벤트를 보낼 수 있도록 publication에 등록.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- 5) 허공 손글씨 메시지 이미지를 담을 Storage 버킷 -------------------------
--    누구나 조회는 가능(공개 URL로 <img> 에 바로 씀), 업로드는 로그인한
--    사용자가 자기 uid 폴더 아래에만 가능하도록 제한합니다.
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view chat images" on storage.objects;
create policy "Anyone can view chat images"
  on storage.objects for select
  using (bucket_id = 'chat-images');

drop policy if exists "Users can upload their own chat images" on storage.objects;
create policy "Users can upload their own chat images"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6) 팔로우 ---------------------------------------------------------------
--    팔로워/팔로잉 수는 저장해두지 않고 이 테이블에서 그때그때 세서 보여줍니다
--    (profiles.followers/following 컬럼은 손대지 않음 — 카운터 동기화 버그를 피하려고요).
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

alter table public.follows enable row level security;

drop policy if exists "Follow edges are viewable by everyone" on public.follows;
create policy "Follow edges are viewable by everyone"
  on public.follows for select
  using (true);

drop policy if exists "Users can follow as themselves" on public.follows;
create policy "Users can follow as themselves"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow as themselves" on public.follows;
create policy "Users can unfollow as themselves"
  on public.follows for delete
  using (auth.uid() = follower_id);

grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- 7) 게시물 ---------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  image_url text not null,
  strokes jsonb,
  drawing jsonb,
  caption text not null default '',
  created_at timestamptz not null default now()
);

alter table public.posts add column if not exists drawing jsonb;

alter table public.posts enable row level security;

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

grant select on public.posts to anon, authenticated;
grant insert, delete on public.posts to authenticated;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Post likes are viewable by everyone" on public.post_likes;
create policy "Post likes are viewable by everyone"
  on public.post_likes for select
  using (true);

drop policy if exists "Users can like as themselves" on public.post_likes;
create policy "Users can like as themselves"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike as themselves" on public.post_likes;
create policy "Users can unlike as themselves"
  on public.post_likes for delete
  using (auth.uid() = user_id);

grant select on public.post_likes to anon, authenticated;
grant insert, delete on public.post_likes to authenticated;

create table if not exists public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

drop policy if exists "Post comments are viewable by everyone" on public.post_comments;
create policy "Post comments are viewable by everyone"
  on public.post_comments for select
  using (true);

drop policy if exists "Users can comment as themselves" on public.post_comments;
create policy "Users can comment as themselves"
  on public.post_comments for insert
  with check (auth.uid() = author_id);

drop policy if exists "Users can delete their own comments" on public.post_comments;
create policy "Users can delete their own comments"
  on public.post_comments for delete
  using (auth.uid() = author_id);

grant select on public.post_comments to anon, authenticated;
grant insert, delete on public.post_comments to authenticated;

-- 게시물 이미지를 담을 Storage 버킷. chat-images와 동일한 패턴(공개 조회, 본인 uid 폴더에만 업로드).
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view post images" on storage.objects;
create policy "Anyone can view post images"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "Users can upload their own post images" on storage.objects;
create policy "Users can upload their own post images"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 8) 채팅 읽음 표시 ---------------------------------------------------------
--    대화방마다 "내가 마지막으로 읽은 시각"을 저장해두고, 상대방 시각과 비교해서
--    내가 보낸 메시지가 읽혔는지 판단합니다.
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

drop policy if exists "Participants can view read receipts" on public.conversation_reads;
create policy "Participants can view read receipts"
  on public.conversation_reads for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_reads.conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

drop policy if exists "Users can create their own read receipt" on public.conversation_reads;
create policy "Users can create their own read receipt"
  on public.conversation_reads for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can refresh their own read receipt" on public.conversation_reads;
create policy "Users can refresh their own read receipt"
  on public.conversation_reads for update
  using (auth.uid() = user_id);

grant select, insert, update on public.conversation_reads to authenticated;

-- Realtime으로 상대방이 읽으면 바로 "읽음"이 뜨도록 등록.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_reads'
  ) then
    alter publication supabase_realtime add table public.conversation_reads;
  end if;
end $$;

-- 9) 에어드로잉 WebView 번들 배포용 버킷 ----------------------------------
--    모바일 앱이 카메라(손 추적) 화면을 열 때 이 안의 파일들(index.html, wasm,
--    손 인식 모델)을 내려받아 폰 로컬에 캐시해두고 file://로 엽니다 — 노트북/
--    케이블 없이도 인터넷만 있으면 동작하게 하기 위함입니다.
--    사용자 데이터가 아니라 우리가 빌드해서 올리는 정적 앱 리소스라서, 다른
--    버킷과 달리 uid 폴더 제한 없이 누구나(anon 포함) 업로드/조회할 수 있게 열어둡니다
--    (frontend/scripts/upload-airview-bundle.mjs가 재빌드할 때마다 다시 올림).
insert into storage.buckets (id, name, public)
values ('air-drawing-webview', 'air-drawing-webview', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view the air-drawing-webview bundle" on storage.objects;
create policy "Anyone can view the air-drawing-webview bundle"
  on storage.objects for select
  using (bucket_id = 'air-drawing-webview');

drop policy if exists "Anyone can upload/replace the air-drawing-webview bundle" on storage.objects;
create policy "Anyone can upload/replace the air-drawing-webview bundle"
  on storage.objects for insert
  with check (bucket_id = 'air-drawing-webview');

drop policy if exists "Anyone can update the air-drawing-webview bundle" on storage.objects;
create policy "Anyone can update the air-drawing-webview bundle"
  on storage.objects for update
  using (bucket_id = 'air-drawing-webview');
