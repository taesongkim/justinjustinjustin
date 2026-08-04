begin;

create or replace function public.core_exam_log_answer_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.current_revision_id is not distinct from old.current_revision_id then
    return new;
  end if;

  if new.visibility = 'private' then
    update public.core_exam_activity_events
    set
      visibility = 'private',
      visibility_owner_id = new.author_id
    where answer_id = new.id;
  end if;

  insert into public.core_exam_activity_events (
    space_id,
    actor_id,
    action,
    question_id,
    answer_id,
    visibility,
    visibility_owner_id
  )
  values (
    new.space_id,
    new.author_id,
    case
      when old.current_revision_id is null
        then 'answer_created'::public.core_exam_activity_action
      else 'answer_updated'::public.core_exam_activity_action
    end,
    new.question_id,
    new.id,
    new.visibility,
    case when new.visibility = 'private' then new.author_id else null end
  );

  return new;
end;
$$;

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

  if new.visibility = 'private' then
    update public.core_exam_activity_events
    set
      visibility = 'private',
      visibility_owner_id = new.author_id
    where contribution_id = new.id;
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

revoke all on function public.core_exam_log_answer_revision() from public;
revoke all on function public.core_exam_log_contribution_revision()
  from public;

commit;
