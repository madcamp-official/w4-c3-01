-- Fixes: logging out and logging into a different account on the same
-- device kept receiving the previous account's push notifications, because
-- the old account's push_tokens row was never removed and both ended up
-- pointing at the same physical device's Expo push token. This trigger
-- guarantees a token has exactly one owner (the most recently registered
-- user) by deleting any other user's row holding the same token whenever a
-- token is inserted or updated.
create or replace function public.enforce_push_token_uniqueness()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens where token = new.token and user_id <> new.user_id;
  return new;
end;
$$;

drop trigger if exists before_push_token_upsert on public.push_tokens;
create trigger before_push_token_upsert
  before insert or update on public.push_tokens
  for each row execute function public.enforce_push_token_uniqueness();
