-- 손끝 Supabase 스키마: 로그인/회원가입에 필요한 최소 구성.
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.

-- 1) 프로필 테이블: auth.users 는 email/password 만 가지고 있어서,
--    아이디/닉네임/하트 이미지 등 앱 전용 데이터는 여기에 따로 둡니다.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  nickname text not null,
  avatar_color text not null default '#EAE2C9',
  heart_url text,
  followers integer not null default 0,
  following integer not null default 0,
  created_at timestamptz not null default now()
);

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
--    signUp() 호출 시 options.data 로 넘긴 값(raw_user_meta_data)을 그대로 사용합니다.
--    이메일 인증(Confirm email)이 켜져 있어도, 트리거는 회원가입 시점에 바로 실행됩니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, nickname, avatar_color, heart_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'nickname',
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#EAE2C9'),
    new.raw_user_meta_data ->> 'heart_url'
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
