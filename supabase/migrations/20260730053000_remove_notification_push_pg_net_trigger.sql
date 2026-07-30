-- The Database Webhook (Integrations > Webhooks) now works after installing
-- it from the dashboard, so the pg_net-based workaround trigger from
-- 20260730050000_notification_push_trigger.sql is redundant and would send
-- every push notification twice. Remove it.
drop trigger if exists on_notification_insert_push on public.notifications;
drop function if exists public.trigger_notification_push();
