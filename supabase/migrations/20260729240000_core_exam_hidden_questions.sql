begin;

create table public.core_exam_question_hidden_marks (
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  question_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, user_id),
  foreign key (question_id, space_id)
    references public.core_exam_questions(id, space_id)
);

alter table public.core_exam_question_hidden_marks enable row level security;

create policy core_exam_question_hidden_marks_select_member
on public.core_exam_question_hidden_marks
for select
to authenticated
using (public.core_exam_is_active_member(space_id));

create or replace function public.core_exam_set_question_hidden(
  target_question_id uuid,
  should_hide boolean
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

  select question.space_id
  into target_space_id
  from public.core_exam_questions question
  where question.id = target_question_id
    and question.archived_at is null;

  if target_space_id is null
    or not public.core_exam_is_active_member(target_space_id)
  then
    raise exception 'Active question membership required'
      using errcode = '42501';
  end if;

  if should_hide then
    insert into public.core_exam_question_hidden_marks (
      space_id,
      question_id,
      user_id
    )
    values (
      target_space_id,
      target_question_id,
      caller_id
    )
    on conflict (question_id, user_id)
    do update set updated_at = now();
  else
    delete from public.core_exam_question_hidden_marks mark
    where mark.question_id = target_question_id
      and mark.user_id = caller_id;
  end if;
end;
$$;

revoke all on public.core_exam_question_hidden_marks from public;
grant select on public.core_exam_question_hidden_marks to authenticated;

revoke all on function public.core_exam_set_question_hidden(uuid, boolean)
  from public;
grant execute on function public.core_exam_set_question_hidden(uuid, boolean)
  to authenticated;

commit;
