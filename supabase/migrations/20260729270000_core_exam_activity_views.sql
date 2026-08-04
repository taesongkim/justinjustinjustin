begin;

create table public.core_exam_activity_views (
  space_id uuid not null
    references public.core_exam_spaces(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  last_viewed_event_id uuid
    references public.core_exam_activity_events(id) on delete set null,
  last_viewed_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

alter table public.core_exam_activity_views enable row level security;

create policy core_exam_activity_views_select_own
on public.core_exam_activity_views
for select
to authenticated
using (
  user_id = auth.uid()
  and public.core_exam_is_active_member(space_id)
);

create or replace function public.core_exam_mark_activity_viewed()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_space_id uuid;
  latest_event_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select membership.space_id
  into target_space_id
  from public.core_exam_memberships membership
  join public.core_exam_spaces space
    on space.id = membership.space_id
  where membership.user_id = caller_id
    and membership.status = 'active'
    and space.slug = 'core-exam-1'
  limit 1;

  if target_space_id is null then
    raise exception 'Active Core Exam membership required'
      using errcode = '42501';
  end if;

  select event.id
  into latest_event_id
  from public.core_exam_activity_events event
  where event.space_id = target_space_id
    and event.actor_id <> caller_id
    and (
      event.visibility = 'group'
      or event.visibility_owner_id = caller_id
    )
  order by event.created_at desc, event.id desc
  limit 1;

  insert into public.core_exam_activity_views (
    space_id,
    user_id,
    last_viewed_event_id,
    last_viewed_at
  )
  values (
    target_space_id,
    caller_id,
    latest_event_id,
    now()
  )
  on conflict (space_id, user_id)
  do update set
    last_viewed_event_id = excluded.last_viewed_event_id,
    last_viewed_at = excluded.last_viewed_at;

  return latest_event_id;
end;
$$;

revoke all on public.core_exam_activity_views from public;
grant select on public.core_exam_activity_views to authenticated;

revoke all on function public.core_exam_mark_activity_viewed() from public;
grant execute on function public.core_exam_mark_activity_viewed()
  to authenticated;

commit;
