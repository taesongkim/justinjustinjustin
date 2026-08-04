begin;

alter table public.core_exam_activity_events
  alter column question_id drop not null,
  add column content_node_id uuid;

alter table public.core_exam_activity_events
  add constraint core_exam_activity_events_content_node_space_fk
  foreign key (content_node_id, space_id)
  references public.core_exam_content_nodes(id, space_id);

alter table public.core_exam_activity_events
  add constraint core_exam_activity_events_target_check
  check (
    (
      question_id is not null
      and content_node_id is null
    )
    or
    (
      question_id is null
      and content_node_id is not null
      and answer_id is null
      and comment_id is null
    )
  );

create index core_exam_activity_content_node_created_idx
  on public.core_exam_activity_events (
    content_node_id,
    created_at desc,
    id desc
  )
  where content_node_id is not null;

create or replace function public.core_exam_log_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.core_exam_activity_events (
    space_id,
    actor_id,
    action,
    content_node_id,
    metadata
  )
  values (
    new.space_id,
    new.actor_id,
    'verification_changed',
    new.content_node_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'state',
        new.state,
        'note',
        new.note
      )
    )
  );
  return new;
end;
$$;

create trigger core_exam_verification_events_log_activity
after insert on public.core_exam_verification_events
for each row execute function public.core_exam_log_verification();

revoke all on function public.core_exam_log_verification() from public;

commit;
