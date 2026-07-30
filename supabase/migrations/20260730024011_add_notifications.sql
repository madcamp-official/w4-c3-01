create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('like', 'follow')),
  post_id uuid references public.posts (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

drop policy if exists "Users can mark their own notifications read" on public.notifications;
create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id);

grant select, update on public.notifications to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
begin
  select author_id into v_author_id from public.posts where id = new.post_id;
  if v_author_id is not null and v_author_id <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (v_author_id, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_like_notify on public.post_likes;
create trigger on_post_like_notify
  after insert on public.post_likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists on_follow_notify on public.follows;
create trigger on_follow_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create table if not exists public.push_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "Users can manage their own push token" on public.push_tokens;
create policy "Users can manage their own push token"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.push_tokens to authenticated;
