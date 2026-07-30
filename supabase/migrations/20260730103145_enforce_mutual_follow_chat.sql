-- New conversations and messages require both participants to follow each
-- other. Existing conversation history remains readable to its participants.

drop policy if exists "Participants can start a conversation" on public.conversations;
drop policy if exists "Mutual followers can start a conversation" on public.conversations;
create policy "Mutual followers can start a conversation"
  on public.conversations for insert
  to authenticated
  with check (
    (select auth.uid()) in (user_a, user_b)
    and exists (
      select 1
      from public.follows
      where follower_id = user_a and following_id = user_b
    )
    and exists (
      select 1
      from public.follows
      where follower_id = user_b and following_id = user_a
    )
  );

drop policy if exists "Participants can send messages" on public.messages;
drop policy if exists "Mutual followers can send messages" on public.messages;
create policy "Mutual followers can send messages"
  on public.messages for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (select auth.uid()) in (c.user_a, c.user_b)
        and exists (
          select 1
          from public.follows
          where follower_id = c.user_a and following_id = c.user_b
        )
        and exists (
          select 1
          from public.follows
          where follower_id = c.user_b and following_id = c.user_a
        )
    )
  );
