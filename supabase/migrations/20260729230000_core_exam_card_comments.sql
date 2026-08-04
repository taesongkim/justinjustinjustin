begin;

create table public.core_exam_comments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  question_id uuid,
  answer_id uuid,
  author_id uuid not null references auth.users(id),
  parent_comment_id uuid references public.core_exam_comments(id),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  unique (id, space_id),
  foreign key (question_id, space_id)
    references public.core_exam_questions(id, space_id),
  foreign key (answer_id, space_id)
    references public.core_exam_answers(id, space_id),
  check (num_nonnulls(question_id, answer_id) = 1)
);

create index core_exam_comments_question_created_idx
  on public.core_exam_comments (question_id, created_at, id)
  where question_id is not null;

create index core_exam_comments_answer_created_idx
  on public.core_exam_comments (answer_id, created_at, id)
  where answer_id is not null;

create or replace function public.core_exam_validate_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_record public.core_exam_comments%rowtype;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select comment.*
  into parent_record
  from public.core_exam_comments comment
  where comment.id = new.parent_comment_id;

  if parent_record.id is null
    or parent_record.parent_comment_id is not null
    or parent_record.space_id <> new.space_id
    or parent_record.question_id is distinct from new.question_id
    or parent_record.answer_id is distinct from new.answer_id
  then
    raise exception 'Reply must share a top-level comment target'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger core_exam_comments_validate_parent
before insert or update of parent_comment_id, question_id, answer_id, space_id
on public.core_exam_comments
for each row
execute function public.core_exam_validate_comment_parent();

alter table public.core_exam_comments enable row level security;

create policy core_exam_comments_select_visible
on public.core_exam_comments
for select
to authenticated
using (
  public.core_exam_is_active_member(space_id)
  and (
    question_id is not null
    or exists (
      select 1
      from public.core_exam_answers answer
      where answer.id = core_exam_comments.answer_id
    )
  )
);

create or replace function public.core_exam_add_comment(
  target_question_id uuid,
  target_answer_id uuid,
  reply_to_comment_id uuid,
  comment_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_space_id uuid;
  answer_record public.core_exam_answers%rowtype;
  created_comment_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if num_nonnulls(target_question_id, target_answer_id) <> 1 then
    raise exception 'Choose exactly one comment target'
      using errcode = '22023';
  end if;

  if char_length(btrim(comment_body)) not between 1 and 4000 then
    raise exception 'Comment must be between 1 and 4000 characters'
      using errcode = '22023';
  end if;

  if target_question_id is not null then
    select question.space_id
    into target_space_id
    from public.core_exam_questions question
    where question.id = target_question_id
      and question.archived_at is null;
  else
    select answer.*
    into answer_record
    from public.core_exam_answers answer
    where answer.id = target_answer_id
      and answer.archived_at is null;
    target_space_id := answer_record.space_id;
  end if;

  if target_space_id is null
    or not public.core_exam_is_active_member(target_space_id)
    or (
      target_answer_id is not null
      and answer_record.visibility = 'private'
      and answer_record.author_id <> caller_id
    )
  then
    raise exception 'Visible target membership required'
      using errcode = '42501';
  end if;

  insert into public.core_exam_comments (
    space_id,
    question_id,
    answer_id,
    author_id,
    parent_comment_id,
    body
  )
  values (
    target_space_id,
    target_question_id,
    target_answer_id,
    caller_id,
    reply_to_comment_id,
    btrim(comment_body)
  )
  returning id into created_comment_id;

  return created_comment_id;
end;
$$;

revoke all on public.core_exam_comments from public;
grant select on public.core_exam_comments to authenticated;

revoke all on function public.core_exam_validate_comment_parent() from public;
revoke all on function public.core_exam_add_comment(
  uuid,
  uuid,
  uuid,
  text
) from public;
grant execute on function public.core_exam_add_comment(
  uuid,
  uuid,
  uuid,
  text
) to authenticated;

commit;
