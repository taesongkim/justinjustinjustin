begin;

-- Per-user 1–5 confidence self-assessment for topics and questions. Shared:
-- every active member can read all levels in their space; writes go only
-- through the SECURITY DEFINER RPC below, which pins user_id to the caller.
create type public.core_exam_confidence_target as enum ('topic', 'question');

create table public.core_exam_confidence (
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type public.core_exam_confidence_target not null,
  -- Question id (core_exam_questions) or topic content-node id
  -- (core_exam_content_nodes, kind = 'topic'). Polymorphic, so no FK.
  target_id uuid not null,
  level smallint not null check (level between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index core_exam_confidence_space_target_idx
  on public.core_exam_confidence (space_id, target_type, target_id);

alter table public.core_exam_confidence enable row level security;

create policy core_exam_confidence_select_member
on public.core_exam_confidence
for select
to authenticated
using (public.core_exam_is_active_member(space_id));

create or replace function public.core_exam_set_confidence(
  target_type public.core_exam_confidence_target,
  target_id uuid,
  confidence_level integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_space_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if confidence_level is null or confidence_level not between 1 and 5 then
    raise exception 'Confidence level must be between 1 and 5'
      using errcode = '22023';
  end if;

  if target_type = 'question' then
    select question.space_id
    into target_space_id
    from public.core_exam_questions question
    where question.id = target_id
      and question.archived_at is null;
  else
    select node.space_id
    into target_space_id
    from public.core_exam_content_nodes node
    where node.id = target_id
      and node.kind = 'topic'
      and node.archived_at is null;
  end if;

  if target_space_id is null
    or not public.core_exam_is_active_member(target_space_id)
  then
    raise exception 'Active membership required' using errcode = '42501';
  end if;

  insert into public.core_exam_confidence (
    space_id,
    user_id,
    target_type,
    target_id,
    level
  )
  values (
    target_space_id,
    caller_id,
    target_type,
    target_id,
    confidence_level
  )
  on conflict (user_id, target_type, target_id)
  do update set
    level = excluded.level,
    updated_at = now();
end;
$$;

revoke all on public.core_exam_confidence from public;
grant select on public.core_exam_confidence to authenticated;

revoke all on function public.core_exam_set_confidence(
  public.core_exam_confidence_target,
  uuid,
  integer
) from public;
grant execute on function public.core_exam_set_confidence(
  public.core_exam_confidence_target,
  uuid,
  integer
) to authenticated;

-- Realtime: let members' confidence rings update live when anyone sets a
-- level. RLS still applies, so only same-space members receive the change.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'core_exam_confidence'
  ) then
    alter publication supabase_realtime
      add table public.core_exam_confidence;
  end if;
end $$;

commit;
