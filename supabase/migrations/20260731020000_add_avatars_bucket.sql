-- Fixes: profile photos were saved as a raw base64 data URL directly into
-- profiles.avatar_url instead of being uploaded to Storage, bloating every
-- profile fetch and rendering as a blank/invisible avatar on mobile. This
-- bucket lets the client upload the photo and store a real public URL
-- instead, matching the existing post-images/chat-images pattern.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
