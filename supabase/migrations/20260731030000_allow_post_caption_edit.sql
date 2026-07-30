-- Lets a post's author edit its caption from the feed's post menu.
drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

grant update on public.posts to authenticated;
