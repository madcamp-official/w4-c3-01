// Called by a Supabase Database Webhook on every INSERT into public.notifications
// (see frontend/supabase/schema.sql's notify_on_like/notify_on_follow triggers —
// those create the row; this function is what actually pushes it to the
// recipient's phone). Uses the service role key to read push_tokens, which
// clients can't read for anyone but themselves (see that table's RLS policy).
//
// Deploy: supabase functions deploy send-notification-push
// Then wire it up in the Supabase dashboard: Database > Webhooks > new hook
// on public.notifications, event INSERT, target = this function's URL.
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface NotificationRow {
  id: number;
  recipient_id: string;
  actor_id: string;
  type: 'like' | 'follow';
  post_id: string | null;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: NotificationRow;
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function messageFor(type: NotificationRow['type'], actorName: string): string {
  return type === 'like' ? `${actorName}님이 회원님의 게시물을 좋아합니다` : `${actorName}님이 회원님을 팔로우하기 시작했어요`;
}

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    const row = payload.record;

    const [{ data: tokenRow, error: tokenError }, { data: actor, error: actorError }] = await Promise.all([
      supabase.from('push_tokens').select('token').eq('user_id', row.recipient_id).maybeSingle(),
      supabase.from('profiles').select('nickname').eq('id', row.actor_id).maybeSingle()
    ]);

    if (tokenError) console.error('push_tokens query failed', tokenError);
    if (actorError) console.error('profiles query failed', actorError);

    // No token registered (never opened the app on a device, or notifications
    // permission denied) — nothing to send, not an error.
    if (!tokenRow?.token) {
      console.log('no push token for recipient', row.recipient_id);
      return new Response('no push token', { status: 200 });
    }

    const body = messageFor(row.type, actor?.nickname ?? '누군가');
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: tokenRow.token,
        title: 'ALine',
        body,
        data: { type: row.type, postId: row.post_id, actorId: row.actor_id }
      })
    });

    const resText = await res.text();
    if (!res.ok) {
      console.error('Expo push send failed', res.status, resText);
    } else {
      console.log('Expo push send response', resText);
    }
    return new Response('ok', { status: 200 });
  } catch (err) {
    // Always 200 — a webhook that keeps failing gets retried/disabled by
    // Supabase, and a missed push notification isn't worth that.
    console.error('send-notification-push error', err);
    return new Response('error logged', { status: 200 });
  }
});
