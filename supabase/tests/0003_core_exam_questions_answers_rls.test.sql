begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'owner@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'member@example.test'),
  ('10000000-0000-0000-0000-000000000004', 'outsider@example.test');

insert into public.core_exam_spaces (id, slug, title)
values
  ('20000000-0000-0000-0000-000000000001', 'core-exam-1', 'Core Exam 1'),
  ('20000000-0000-0000-0000-000000000002', 'other-space', 'Other Space');

insert into public.core_exam_memberships (space_id, user_id, role, status)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'member',
    'active'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    'owner',
    'active'
  );

insert into public.core_exam_content_nodes (
  id,
  space_id,
  stable_key,
  kind,
  sort_key,
  created_by
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'topic-01.mask-lower-higher',
    'topic',
    '001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'topic-01.other',
    'topic',
    '001',
    '10000000-0000-0000-0000-000000000004'
  );

insert into public.core_exam_questions (
  id,
  space_id,
  topic_node_id,
  stable_key,
  origin,
  prompt,
  rank
)
values (
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'question.topic-01.what-is-the-lower-self',
  'curated',
  'What is the Lower Self?',
  1000
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select results_eq(
  'select prompt from public.core_exam_questions order by rank',
  array['What is the Lower Self?'::text],
  'an active member sees curated questions'
);

select lives_ok(
  $$
    select public.core_exam_submit_question(
      '30000000-0000-0000-0000-000000000001',
      'How does the Lower Self differ from the Mask?',
      'Connect this to the formation sequence.'
    )
  $$,
  'an active member can submit a topic question'
);

select results_eq(
  $$
    select submitted_by::text || ':' || origin::text
    from public.core_exam_questions
    where origin = 'submitted'
  $$,
  array['10000000-0000-0000-0000-000000000002:submitted'],
  'a submitted question is attributed to the authenticated member'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_questions submitted
    join public.core_exam_questions curated
      on curated.origin = 'curated'
    where submitted.origin = 'submitted'
      and submitted.rank > curated.rank
  $$,
  array[1],
  'submitted questions sort after the curated sequence by default'
);

select lives_ok(
  $$
    select public.core_exam_save_personal_answer(
      '40000000-0000-0000-0000-000000000001',
      null,
      'group',
      '{"type":"doc","content":[]}'::jsonb,
      'The Lower Self contains denied negative intentions.',
      'First answer'
    )
  $$,
  'a member can create their personal answer'
);

select results_eq(
  $$
    select answer.author_id::text || ':' || revision.edited_by::text
    from public.core_exam_answers answer
    join public.core_exam_answer_revisions revision
      on revision.id = answer.current_revision_id
  $$,
  array[
    '10000000-0000-0000-0000-000000000002:10000000-0000-0000-0000-000000000002'
  ],
  'personal answer ownership and revision attribution derive from auth'
);

select lives_ok(
  $$
    select public.core_exam_set_question_likelihood(
      '40000000-0000-0000-0000-000000000001',
      'likely'
    )
  $$,
  'a member can mark their own test likelihood'
);

select results_eq(
  $$
    select user_id::text || ':' || likelihood::text
    from public.core_exam_question_likelihood_marks
  $$,
  array['10000000-0000-0000-0000-000000000002:likely'],
  'likelihood marks retain the member identity'
);

select lives_ok(
  $$
    select public.core_exam_set_question_likelihood(
      '40000000-0000-0000-0000-000000000001',
      'unsure'
    )
  $$,
  'a member can change their own likelihood mark'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_question_likelihood_marks
    where likelihood = 'unsure'
  $$,
  array[1],
  'changing likelihood updates rather than duplicates the personal mark'
);

select throws_ok(
  $$
    insert into public.core_exam_questions (
      space_id,
      topic_node_id,
      origin,
      prompt,
      rank,
      submitted_by
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      'submitted',
      'Spoofed question',
      9000,
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  null,
  'clients cannot insert questions or spoof submitters directly'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select results_eq(
  $$
    select revision.plain_text
    from public.core_exam_answers answer
    join public.core_exam_answer_revisions revision
      on revision.id = answer.current_revision_id
  $$,
  array['The Lower Self contains denied negative intentions.'::text],
  'another member can read a group-visible personal answer'
);

select results_eq(
  $$
    select display_name
    from public.core_exam_profiles profile
    join public.core_exam_question_likelihood_marks mark
      on mark.user_id = profile.user_id
  $$,
  array[]::text[],
  'likelihood attribution does not invent a profile when none exists'
);

select throws_ok(
  $$
    select public.core_exam_save_personal_answer(
      '40000000-0000-0000-0000-000000000001',
      (
        select current_revision_id
        from public.core_exam_answers
        where author_id = '10000000-0000-0000-0000-000000000002'
      ),
      'group',
      '{}'::jsonb,
      'Tried to replace another answer.',
      null
    )
  $$,
  '40001',
  null,
  'one member cannot revise another member personal answer'
);

select lives_ok(
  $$
    select public.core_exam_set_question_likelihood(
      '40000000-0000-0000-0000-000000000001',
      'unlikely'
    )
  $$,
  'another member can add an independent likelihood mark'
);

select results_eq(
  $$
    select likelihood::text || ':' || count(*)::text
    from public.core_exam_question_likelihood_marks
    group by likelihood
    order by likelihood::text
  $$,
  array['unlikely:1'::text, 'unsure:1'::text],
  'active members can inspect the attributable likelihood aggregate'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_questions',
  array[0],
  'a user outside the space cannot read its questions'
);

select results_eq(
  'select count(*)::integer from public.core_exam_answers',
  array[0],
  'a user outside the space cannot read its answers'
);

select results_eq(
  'select count(*)::integer from public.core_exam_question_likelihood_marks',
  array[0],
  'a user outside the space cannot read likelihood identities'
);

select throws_ok(
  $$
    select public.core_exam_submit_question(
      '30000000-0000-0000-0000-000000000001',
      'Can an outsider ask this question?',
      null
    )
  $$,
  '42501',
  null,
  'a user outside the space cannot submit a question'
);

select throws_ok(
  $$
    select public.core_exam_set_question_likelihood(
      '40000000-0000-0000-0000-000000000001',
      'likely'
    )
  $$,
  '42501',
  null,
  'a user outside the space cannot mark question likelihood'
);

select * from finish();

rollback;
