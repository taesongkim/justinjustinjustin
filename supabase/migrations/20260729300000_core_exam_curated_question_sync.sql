begin;

create or replace function public.core_exam_sync_curated_question_bank(
  question_bank jsonb,
  reset_collaboration boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_space_id uuid;
  item jsonb;
  item_stable_key text;
  item_topic_stable_key text;
  item_prompt text;
  item_rank integer;
  item_archived boolean;
  item_topic_id uuid;
  provided_keys text[] := array[]::text[];
  provided_positions text[] := array[]::text[];
  item_position text;
  active_count integer;
  archived_count integer;
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
    and membership.role = 'owner'
    and membership.status = 'active'
    and space.slug = 'core-exam-1'
  limit 1;

  if target_space_id is null then
    raise exception 'Active Core Exam owner required'
      using errcode = '42501';
  end if;

  if jsonb_typeof(question_bank) <> 'array'
    or jsonb_array_length(question_bank) < 1
    or jsonb_array_length(question_bank) > 500
  then
    raise exception 'Question bank must contain between 1 and 500 items'
      using errcode = '22023';
  end if;

  for item in
    select value from jsonb_array_elements(question_bank)
  loop
    item_stable_key := btrim(item ->> 'stableKey');
    item_topic_stable_key := btrim(item ->> 'topicStableKey');
    item_prompt := btrim(item ->> 'prompt');
    item_rank := (item ->> 'rank')::integer;
    item_archived := coalesce((item ->> 'archived')::boolean, false);

    if item_stable_key is null
      or item_stable_key !~ '^[a-z0-9]+(?:[.-][a-z0-9]+)*$'
    then
      raise exception 'Every curated question needs a valid stable key'
        using errcode = '22023';
    end if;

    if item_stable_key = any(provided_keys) then
      raise exception 'Duplicate curated question stable key: %',
        item_stable_key
        using errcode = '22023';
    end if;

    if char_length(item_prompt) not between 5 and 500 then
      raise exception 'Every question must be between 5 and 500 characters'
        using errcode = '22023';
    end if;

    if item_rank is null or item_rank < 1 then
      raise exception 'Every question needs a positive rank'
        using errcode = '22023';
    end if;

    select node.id
    into item_topic_id
    from public.core_exam_content_nodes node
    where node.space_id = target_space_id
      and node.stable_key = item_topic_stable_key
      and node.kind = 'topic'
      and node.archived_at is null;

    if item_topic_id is null then
      raise exception 'Unknown active topic: %', item_topic_stable_key
        using errcode = '22023';
    end if;

    item_position := item_topic_stable_key || ':' || item_rank::text;
    if not item_archived and item_position = any(provided_positions) then
      raise exception 'Duplicate active question rank: %', item_position
        using errcode = '22023';
    end if;

    provided_keys := array_append(provided_keys, item_stable_key);
    if not item_archived then
      provided_positions := array_append(provided_positions, item_position);
    end if;

    insert into public.core_exam_questions (
      space_id,
      topic_node_id,
      stable_key,
      origin,
      prompt,
      rank,
      submitted_by,
      archived_at
    )
    values (
      target_space_id,
      item_topic_id,
      item_stable_key,
      'curated',
      item_prompt,
      item_rank,
      null,
      case when item_archived then now() else null end
    )
    on conflict (space_id, stable_key)
    do update set
      topic_node_id = excluded.topic_node_id,
      prompt = excluded.prompt,
      rank = excluded.rank,
      archived_at = case
        when item_archived
          then coalesce(public.core_exam_questions.archived_at, now())
        else null
      end,
      updated_at = now()
    where public.core_exam_questions.origin = 'curated';
  end loop;

  update public.core_exam_questions question
  set
    archived_at = coalesce(question.archived_at, now()),
    updated_at = now()
  where question.space_id = target_space_id
    and question.origin = 'curated'
    and not (question.stable_key = any(provided_keys));

  if reset_collaboration then
    -- Remove dependent activity before comments and answers to satisfy their
    -- foreign keys. A second pass below removes reset-generated events.
    delete from public.core_exam_activity_events event
    using public.core_exam_questions question
    where event.question_id = question.id
      and question.space_id = target_space_id
      and question.origin = 'curated';

    delete from public.core_exam_comments comment
    using public.core_exam_questions question
    where question.space_id = target_space_id
      and question.origin = 'curated'
      and (
        comment.question_id = question.id
        or comment.answer_id in (
          select answer.id
          from public.core_exam_answers answer
          where answer.question_id = question.id
        )
      );

    delete from public.core_exam_question_likelihood_marks mark
    using public.core_exam_questions question
    where mark.question_id = question.id
      and question.space_id = target_space_id
      and question.origin = 'curated';

    delete from public.core_exam_question_hidden_marks mark
    using public.core_exam_questions question
    where mark.question_id = question.id
      and question.space_id = target_space_id
      and question.origin = 'curated';

    delete from public.core_exam_answers answer
    using public.core_exam_questions question
    where answer.question_id = question.id
      and question.space_id = target_space_id
      and question.origin = 'curated';

    -- Hidden-mark deletion intentionally emits a question_shown event during
    -- normal member use. Remove activity last so reset-generated events are
    -- withdrawn along with the pre-existing test history.
    delete from public.core_exam_activity_events event
    using public.core_exam_questions question
    where event.question_id = question.id
      and question.space_id = target_space_id
      and question.origin = 'curated';
  end if;

  select count(*) filter (where question.archived_at is null),
    count(*) filter (where question.archived_at is not null)
  into active_count, archived_count
  from public.core_exam_questions question
  where question.space_id = target_space_id
    and question.origin = 'curated';

  return jsonb_build_object(
    'activeCount', active_count,
    'archivedCount', archived_count,
    'collaborationReset', reset_collaboration
  );
end;
$$;

revoke all on function public.core_exam_sync_curated_question_bank(
  jsonb,
  boolean
) from public;
grant execute on function public.core_exam_sync_curated_question_bank(
  jsonb,
  boolean
) to authenticated;

commit;
