begin;

create type public.core_exam_activity_action as enum (
  'question_submitted',
  'answer_created',
  'answer_updated',
  'comment_added',
  'likelihood_marked',
  'question_hidden',
  'question_shown'
);

create table public.core_exam_activity_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action public.core_exam_activity_action not null,
  question_id uuid not null,
  answer_id uuid,
  comment_id uuid,
  visibility public.core_exam_visibility not null default 'group',
  visibility_owner_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (question_id, space_id)
    references public.core_exam_questions(id, space_id),
  foreign key (answer_id, space_id)
    references public.core_exam_answers(id, space_id),
  foreign key (comment_id, space_id)
    references public.core_exam_comments(id, space_id),
  check (
    (visibility = 'group' and visibility_owner_id is null)
    or
    (visibility = 'private' and visibility_owner_id is not null)
  )
);

create index core_exam_activity_space_created_idx
  on public.core_exam_activity_events (space_id, created_at desc, id desc);

alter table public.core_exam_activity_events enable row level security;

create policy core_exam_activity_events_select_visible
on public.core_exam_activity_events
for select
to authenticated
using (
  public.core_exam_is_active_member(space_id)
  and (
    visibility = 'group'
    or visibility_owner_id = auth.uid()
  )
);

create or replace function public.core_exam_log_submitted_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.origin = 'submitted' then
    insert into public.core_exam_activity_events (
      space_id,
      actor_id,
      action,
      question_id
    )
    values (
      new.space_id,
      new.submitted_by,
      'question_submitted',
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger core_exam_questions_log_activity
after insert on public.core_exam_questions
for each row execute function public.core_exam_log_submitted_question();

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

create trigger core_exam_answers_log_activity
after update of current_revision_id on public.core_exam_answers
for each row execute function public.core_exam_log_answer_revision();

create or replace function public.core_exam_log_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_question_id uuid := new.question_id;
  target_visibility public.core_exam_visibility := 'group';
  target_owner_id uuid;
begin
  if new.answer_id is not null then
    select answer.question_id, answer.visibility, answer.author_id
    into target_question_id, target_visibility, target_owner_id
    from public.core_exam_answers answer
    where answer.id = new.answer_id;
  end if;

  insert into public.core_exam_activity_events (
    space_id,
    actor_id,
    action,
    question_id,
    answer_id,
    comment_id,
    visibility,
    visibility_owner_id
  )
  values (
    new.space_id,
    new.author_id,
    'comment_added',
    target_question_id,
    new.answer_id,
    new.id,
    target_visibility,
    case when target_visibility = 'private' then target_owner_id else null end
  );

  return new;
end;
$$;

create trigger core_exam_comments_log_activity
after insert on public.core_exam_comments
for each row execute function public.core_exam_log_comment();

create or replace function public.core_exam_log_likelihood()
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
    question_id,
    metadata
  )
  values (
    new.space_id,
    new.user_id,
    'likelihood_marked',
    new.question_id,
    jsonb_build_object('likelihood', new.likelihood)
  );
  return new;
end;
$$;

create trigger core_exam_likelihood_marks_log_activity
after insert or update of likelihood
on public.core_exam_question_likelihood_marks
for each row execute function public.core_exam_log_likelihood();

create or replace function public.core_exam_log_hidden_mark()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mark_space_id uuid;
  mark_user_id uuid;
  mark_question_id uuid;
begin
  if tg_op = 'DELETE' then
    mark_space_id := old.space_id;
    mark_user_id := old.user_id;
    mark_question_id := old.question_id;
  else
    mark_space_id := new.space_id;
    mark_user_id := new.user_id;
    mark_question_id := new.question_id;
  end if;

  insert into public.core_exam_activity_events (
    space_id,
    actor_id,
    action,
    question_id
  )
  values (
    mark_space_id,
    mark_user_id,
    case
      when tg_op = 'DELETE'
        then 'question_shown'::public.core_exam_activity_action
      else 'question_hidden'::public.core_exam_activity_action
    end,
    mark_question_id
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger core_exam_hidden_marks_log_activity
after insert or delete on public.core_exam_question_hidden_marks
for each row execute function public.core_exam_log_hidden_mark();

revoke all on public.core_exam_activity_events from public;
grant select on public.core_exam_activity_events to authenticated;

revoke all on function public.core_exam_log_submitted_question() from public;
revoke all on function public.core_exam_log_answer_revision() from public;
revoke all on function public.core_exam_log_comment() from public;
revoke all on function public.core_exam_log_likelihood() from public;
revoke all on function public.core_exam_log_hidden_mark() from public;

commit;
