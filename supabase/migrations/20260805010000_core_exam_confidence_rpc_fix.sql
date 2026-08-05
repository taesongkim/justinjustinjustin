begin;

-- The first version named its parameters target_type/target_id, which collide
-- with core_exam_confidence's columns of the same name and made the INSERT's
-- ON CONFLICT ambiguous ("column reference target_type is ambiguous"), so every
-- call failed. Recreate with p_-prefixed params. Signature (arg types) is
-- unchanged, so grants carry the same shape.
drop function if exists public.core_exam_set_confidence(
  public.core_exam_confidence_target,
  uuid,
  integer
);

create function public.core_exam_set_confidence(
  p_target_type public.core_exam_confidence_target,
  p_target_id uuid,
  p_level integer
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

  if p_level is null or p_level not between 1 and 5 then
    raise exception 'Confidence level must be between 1 and 5'
      using errcode = '22023';
  end if;

  if p_target_type = 'question' then
    select question.space_id
    into target_space_id
    from public.core_exam_questions question
    where question.id = p_target_id
      and question.archived_at is null;
  else
    select node.space_id
    into target_space_id
    from public.core_exam_content_nodes node
    where node.id = p_target_id
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
    p_target_type,
    p_target_id,
    p_level
  )
  on conflict (user_id, target_type, target_id)
  do update set
    level = excluded.level,
    updated_at = now();
end;
$$;

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

commit;
