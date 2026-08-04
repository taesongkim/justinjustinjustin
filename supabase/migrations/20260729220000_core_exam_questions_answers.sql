begin;

create type public.core_exam_question_origin as enum ('curated', 'submitted');
create type public.core_exam_test_likelihood as enum (
  'likely',
  'unsure',
  'unlikely'
);

create table public.core_exam_questions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  topic_node_id uuid not null,
  stable_key text,
  origin public.core_exam_question_origin not null,
  prompt text not null check (char_length(prompt) between 5 and 500),
  detail text check (char_length(detail) <= 4000),
  rank integer not null check (rank > 0),
  submitted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, space_id),
  unique (space_id, stable_key),
  foreign key (topic_node_id, space_id)
    references public.core_exam_content_nodes(id, space_id),
  check (
    (
      origin = 'curated'
      and stable_key is not null
      and submitted_by is null
    )
    or (
      origin = 'submitted'
      and stable_key is null
      and submitted_by is not null
    )
  ),
  check (
    stable_key is null
    or stable_key ~ '^[a-z0-9]+(?:[.-][a-z0-9]+)*$'
  )
);

create index core_exam_questions_topic_rank_idx
  on public.core_exam_questions (topic_node_id, rank, created_at, id)
  where archived_at is null;

create table public.core_exam_answers (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  question_id uuid not null,
  author_id uuid not null references auth.users(id),
  visibility public.core_exam_visibility not null default 'group',
  current_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, space_id),
  foreign key (question_id, space_id)
    references public.core_exam_questions(id, space_id)
);

create unique index core_exam_answers_one_personal_idx
  on public.core_exam_answers (question_id, author_id)
  where archived_at is null;

create table public.core_exam_answer_revisions (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.core_exam_answers(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  schema_version text not null check (schema_version = 'core-exam-v1'),
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  plain_text text not null,
  edit_summary text check (char_length(edit_summary) <= 500),
  edited_by uuid not null references auth.users(id),
  based_on_revision_id uuid,
  created_at timestamptz not null default now(),
  unique (answer_id, revision_number),
  unique (id, answer_id),
  foreign key (based_on_revision_id, answer_id)
    references public.core_exam_answer_revisions(id, answer_id)
);

alter table public.core_exam_answers
  add constraint core_exam_answers_current_revision_fk
  foreign key (current_revision_id, id)
  references public.core_exam_answer_revisions(id, answer_id);

create table public.core_exam_question_likelihood_marks (
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  question_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  likelihood public.core_exam_test_likelihood not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, user_id),
  foreign key (question_id, space_id)
    references public.core_exam_questions(id, space_id)
);

alter table public.core_exam_questions enable row level security;
alter table public.core_exam_answers enable row level security;
alter table public.core_exam_answer_revisions enable row level security;
alter table public.core_exam_question_likelihood_marks
  enable row level security;

create policy core_exam_questions_select_member
on public.core_exam_questions
for select
to authenticated
using (public.core_exam_is_active_member(space_id));

create policy core_exam_answers_select_visible
on public.core_exam_answers
for select
to authenticated
using (
  public.core_exam_is_active_member(space_id)
  and (
    visibility = 'group'
    or author_id = auth.uid()
  )
);

create policy core_exam_answer_revisions_select_visible
on public.core_exam_answer_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.core_exam_answers answer
    where answer.id = core_exam_answer_revisions.answer_id
  )
);

create policy core_exam_question_likelihood_marks_select_member
on public.core_exam_question_likelihood_marks
for select
to authenticated
using (public.core_exam_is_active_member(space_id));

create or replace function public.core_exam_submit_question(
  target_topic_node_id uuid,
  question_prompt text,
  question_detail text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_space_id uuid;
  next_rank integer;
  created_question_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(btrim(question_prompt)) not between 5 and 500 then
    raise exception 'Question must be between 5 and 500 characters'
      using errcode = '22023';
  end if;

  if char_length(question_detail) > 4000 then
    raise exception 'Question detail is too long' using errcode = '22001';
  end if;

  select node.space_id
  into target_space_id
  from public.core_exam_content_nodes node
  where node.id = target_topic_node_id
    and node.kind = 'topic'
    and node.archived_at is null;

  if target_space_id is null
    or not public.core_exam_is_active_member(target_space_id)
  then
    raise exception 'Active topic membership required'
      using errcode = '42501';
  end if;

  select coalesce(max(question.rank), 0) + 1000
  into next_rank
  from public.core_exam_questions question
  where question.topic_node_id = target_topic_node_id
    and question.archived_at is null;

  insert into public.core_exam_questions (
    space_id,
    topic_node_id,
    origin,
    prompt,
    detail,
    rank,
    submitted_by
  )
  values (
    target_space_id,
    target_topic_node_id,
    'submitted',
    btrim(question_prompt),
    nullif(btrim(question_detail), ''),
    next_rank,
    caller_id
  )
  returning id into created_question_id;

  return created_question_id;
end;
$$;

create or replace function public.core_exam_save_personal_answer(
  target_question_id uuid,
  base_revision_id uuid,
  answer_visibility public.core_exam_visibility,
  answer_body jsonb,
  answer_plain_text text,
  answer_edit_summary text default null
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
  created_revision_id uuid;
  next_revision_number integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if jsonb_typeof(answer_body) is distinct from 'object' then
    raise exception 'Answer body must be an object' using errcode = '22023';
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

  select answer.*
  into answer_record
  from public.core_exam_answers answer
  where answer.question_id = target_question_id
    and answer.author_id = caller_id
    and answer.archived_at is null
  for update;

  if answer_record.id is null then
    if base_revision_id is not null then
      raise exception 'Personal answer does not exist'
        using errcode = '40001';
    end if;

    insert into public.core_exam_answers (
      space_id,
      question_id,
      author_id,
      visibility
    )
    values (
      target_space_id,
      target_question_id,
      caller_id,
      answer_visibility
    )
    returning * into answer_record;

    next_revision_number := 1;
  else
    if answer_record.current_revision_id is distinct from base_revision_id then
      raise exception 'Personal answer has a newer revision'
        using errcode = '40001';
    end if;

    select max(revision.revision_number) + 1
    into next_revision_number
    from public.core_exam_answer_revisions revision
    where revision.answer_id = answer_record.id;
  end if;

  insert into public.core_exam_answer_revisions (
    answer_id,
    revision_number,
    schema_version,
    body,
    plain_text,
    edit_summary,
    edited_by,
    based_on_revision_id
  )
  values (
    answer_record.id,
    next_revision_number,
    'core-exam-v1',
    answer_body,
    answer_plain_text,
    nullif(btrim(answer_edit_summary), ''),
    caller_id,
    base_revision_id
  )
  returning id into created_revision_id;

  update public.core_exam_answers
  set
    current_revision_id = created_revision_id,
    visibility = answer_visibility,
    updated_at = now()
  where id = answer_record.id;

  return created_revision_id;
end;
$$;

create or replace function public.core_exam_set_question_likelihood(
  target_question_id uuid,
  selected_likelihood public.core_exam_test_likelihood
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

  insert into public.core_exam_question_likelihood_marks (
    space_id,
    question_id,
    user_id,
    likelihood
  )
  values (
    target_space_id,
    target_question_id,
    caller_id,
    selected_likelihood
  )
  on conflict (question_id, user_id)
  do update set
    likelihood = excluded.likelihood,
    updated_at = now();
end;
$$;

revoke all on public.core_exam_questions from public;
revoke all on public.core_exam_answers from public;
revoke all on public.core_exam_answer_revisions from public;
revoke all on public.core_exam_question_likelihood_marks from public;

grant select on public.core_exam_questions to authenticated;
grant select on public.core_exam_answers to authenticated;
grant select on public.core_exam_answer_revisions to authenticated;
grant select on public.core_exam_question_likelihood_marks to authenticated;

revoke all on function public.core_exam_submit_question(uuid, text, text)
  from public;
revoke all on function public.core_exam_save_personal_answer(
  uuid,
  uuid,
  public.core_exam_visibility,
  jsonb,
  text,
  text
) from public;
revoke all on function public.core_exam_set_question_likelihood(
  uuid,
  public.core_exam_test_likelihood
) from public;

grant execute on function public.core_exam_submit_question(uuid, text, text)
  to authenticated;
grant execute on function public.core_exam_save_personal_answer(
  uuid,
  uuid,
  public.core_exam_visibility,
  jsonb,
  text,
  text
) to authenticated;
grant execute on function public.core_exam_set_question_likelihood(
  uuid,
  public.core_exam_test_likelihood
) to authenticated;
commit;
