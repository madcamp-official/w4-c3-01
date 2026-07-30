-- send-notification-push Edge Function queries these as service_role. RLS
-- is bypassed by service_role, but the underlying table GRANT is separate
-- and was missing, causing silent "42501: insufficient_privilege" query
-- failures (the function still returns 200 either way, so this was invisible
-- until explicit error logging was added).
grant select on public.push_tokens to service_role;
grant select on public.profiles to service_role;
