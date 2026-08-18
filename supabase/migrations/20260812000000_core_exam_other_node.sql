-- The "Other" catch-all topic: a place to ask misc questions. It behaves like
-- any exam topic, so it just needs a content node (kind = 'topic') with the
-- stable_key the client (topics.ts) points at: topic-17.other.
--
-- Idempotent: inserts one node per space, owned by that space's owner, skipping
-- spaces that already have it (or have no owner to attribute it to).
insert into public.core_exam_content_nodes (
  space_id,
  stable_key,
  kind,
  sort_key,
  created_by
)
select
  s.id,
  'topic-17.other',
  'topic',
  'topic-17',
  (
    select m.user_id
    from public.core_exam_memberships m
    where m.space_id = s.id
      and m.role = 'owner'
    order by m.joined_at
    limit 1
  )
from public.core_exam_spaces s
where exists (
  select 1
  from public.core_exam_memberships m
  where m.space_id = s.id
    and m.role = 'owner'
)
on conflict (space_id, stable_key) do nothing;
