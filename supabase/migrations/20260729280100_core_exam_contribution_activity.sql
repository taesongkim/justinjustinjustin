begin;

alter table public.core_exam_activity_events
  add column contribution_id uuid
    references public.core_exam_contributions(id) on delete cascade;

alter table public.core_exam_activity_events
  drop constraint core_exam_activity_events_target_check;

alter table public.core_exam_activity_events
  add constraint core_exam_activity_events_target_check
  check (
    (
      question_id is not null
      and content_node_id is null
      and contribution_id is null
    )
    or
    (
      question_id is null
      and content_node_id is not null
      and answer_id is null
      and comment_id is null
    )
  );

create or replace function public.core_exam_log_contribution_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.current_revision_id is not distinct from old.current_revision_id then
    return new;
  end if;

  insert into public.core_exam_activity_events (
    space_id,
    actor_id,
    action,
    content_node_id,
    contribution_id,
    visibility,
    visibility_owner_id,
    metadata
  )
  values (
    new.space_id,
    new.author_id,
    case
      when old.current_revision_id is null
        then 'contribution_created'::public.core_exam_activity_action
      else 'contribution_updated'::public.core_exam_activity_action
    end,
    new.target_node_id,
    new.id,
    new.visibility,
    case when new.visibility = 'private' then new.author_id else null end,
    jsonb_build_object('kind', new.kind)
  );

  return new;
end;
$$;

create trigger core_exam_contributions_log_activity
after update of current_revision_id on public.core_exam_contributions
for each row execute function public.core_exam_log_contribution_revision();

revoke all on function public.core_exam_log_contribution_revision()
  from public;

commit;
