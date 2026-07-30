-- Calls the send-notification-push Edge Function directly via pg_net instead
-- of a Database Webhook — this project's dashboard fails to create webhooks
-- ("schema \"supabase_functions\" does not exist"), so the trigger does the
-- webhook's job itself. The Authorization header uses the anon (publishable)
-- key, which is already public in the client bundles, just to satisfy the
-- Edge Function's default JWT check.
create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://fsudafwwbhjzlmehxjqt.supabase.co/functions/v1/send-notification-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdWRhZnd3YmhqemxtZWh4anF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NzgzMzgsImV4cCI6MjEwMDQ1NDMzOH0.wQJcwneD1kV4qIrxyGJfFifbUZPbGGtVLakuhFLUl5U'
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', row_to_json(new))
  );
  return new;
end;
$$;

drop trigger if exists on_notification_insert_push on public.notifications;
create trigger on_notification_insert_push
  after insert on public.notifications
  for each row execute function public.trigger_notification_push();
