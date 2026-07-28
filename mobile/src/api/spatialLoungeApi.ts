import { supabase } from '@/lib/supabaseClient';
import type {
  SpatialLounge,
  SpatialLoungeContent,
  SpatialStrokeData,
  SpatialTransform,
} from '@/features/lounge/spatialTypes';

type LoungeContentRow = {
  content_id: string;
  lounge_id: string;
  author_id: string | null;
  legacy_user_id: string | null;
  user_name: string;
  transform: SpatialTransform;
  stroke_data: SpatialStrokeData;
  surface: SpatialLoungeContent['surface'];
  created_at: string;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase 환경 변수를 확인해 주세요.');
  }
  return supabase;
}

function toContent(row: LoungeContentRow): SpatialLoungeContent {
  return {
    lounge_id: row.lounge_id,
    content_id: row.content_id,
    user_id: row.author_id ?? row.legacy_user_id ?? 'unknown',
    user_name: row.user_name,
    transform: row.transform,
    stroke_data: row.stroke_data,
    surface: row.surface,
    created_at: row.created_at,
  };
}

export async function fetchSpatialLounge(loungeId: string): Promise<SpatialLounge> {
  const { data, error } = await requireSupabase()
    .from('lounges')
    .select('id, name, location, description, accent')
    .eq('id', loungeId)
    .single();

  if (error || !data) throw new Error(error?.message ?? '라운지를 찾지 못했어요.');
  return data as SpatialLounge;
}

export async function fetchSpatialContents(loungeId: string): Promise<SpatialLoungeContent[]> {
  const { data, error } = await requireSupabase()
    .from('lounge_contents')
    .select(
      'content_id, lounge_id, author_id, legacy_user_id, user_name, transform, stroke_data, surface, created_at',
    )
    .eq('lounge_id', loungeId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as LoungeContentRow[]).map(toContent);
}

export async function addSpatialContent(
  content: SpatialLoungeContent,
  authorId: string,
): Promise<SpatialLoungeContent> {
  const { data, error } = await requireSupabase()
    .from('lounge_contents')
    .insert({
      content_id: content.content_id,
      lounge_id: content.lounge_id,
      author_id: authorId,
      legacy_user_id: null,
      user_name: content.user_name,
      transform: content.transform,
      stroke_data: content.stroke_data,
      surface: content.surface,
      created_at: content.created_at,
    })
    .select(
      'content_id, lounge_id, author_id, legacy_user_id, user_name, transform, stroke_data, surface, created_at',
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? '낙서를 저장하지 못했어요.');
  return toContent(data as LoungeContentRow);
}

export async function deleteMySpatialContents(
  loungeId: string,
  authorId: string,
): Promise<string[]> {
  const { data, error } = await requireSupabase()
    .from('lounge_contents')
    .delete()
    .eq('lounge_id', loungeId)
    .eq('author_id', authorId)
    .select('content_id');

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.content_id as string);
}

export function subscribeToSpatialContents(loungeId: string, refresh: () => void) {
  const client = requireSupabase();
  const channel = client
    .channel(`spatial-lounge:${loungeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lounge_contents',
      },
      refresh,
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeToLoungePresence(
  loungeId: string,
  userId: string,
  onCount: (count: number) => void,
) {
  const client = requireSupabase();
  const channel = client.channel(`spatial-presence:${loungeId}`, {
    config: { presence: { key: userId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const count = Object.values(channel.presenceState()).reduce(
        (total, presences) => total + presences.length,
        0,
      );
      onCount(Math.max(1, count));
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({ user_id: userId, joined_at: new Date().toISOString() });
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
}
