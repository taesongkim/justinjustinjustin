begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'owner@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'member@example.test'),
  ('10000000-0000-0000-0000-000000000004', 'outsider@example.test');

insert into public.core_exam_profiles (user_id, display_name, avatar_color)
values
  ('10000000-0000-0000-0000-000000000001', 'Owner', '#5b8def'),
  ('10000000-0000-0000-0000-000000000002', 'Member', '#ef8d5b'),
  ('10000000-0000-0000-0000-000000000004', 'Outsider', '#555555');

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
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'topic-01.mask-lower-higher',
  'topic',
  '001',
  '10000000-0000-0000-0000-000000000001'
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
  'question.q001',
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

select lives_ok(
  $$
    select public.core_exam_set_question_hidden(
      '40000000-0000-0000-0000-000000000001',
      true
    )
  $$,
  'a member can hide a question for themselves'
);

select results_eq(
  $$
    select user_id::text
    from public.core_exam_question_hidden_marks
  $$,
  array['10000000-0000-0000-0000-000000000002'::text],
  'the hidden mark is attributed to the authenticated member'
);

select lives_ok(
  $$
    select public.core_exam_set_question_hidden(
      '40000000-0000-0000-0000-000000000001',
      true
    )
  $$,
  'hiding an already-hidden question is idempotent'
);

select results_eq(
  'select count(*)::integer from public.core_exam_question_hidden_marks',
  array[1],
  'repeated hiding does not duplicate the mark'
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
    select profile.display_name
    from public.core_exam_question_hidden_marks mark
    join public.core_exam_profiles profile on profile.user_id = mark.user_id
  $$,
  array['Member'::text],
  'another active member can see who hid the question'
);

select lives_ok(
  $$
    select public.core_exam_set_question_hidden(
      '40000000-0000-0000-0000-000000000001',
      true
    )
  $$,
  'another member can add an independent hidden mark'
);

select results_eq(
  'select count(*)::integer from public.core_exam_question_hidden_marks',
  array[2],
  'hidden marks form an attributable group signal'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_set_question_hidden(
      '40000000-0000-0000-0000-000000000001',
      false
    )
  $$,
  'a member can restore a hidden question'
);

select results_eq(
  $$
    select user_id::text
    from public.core_exam_question_hidden_marks
  $$,
  array['10000000-0000-0000-0000-000000000001'::text],
  'restoring removes only the current member hidden mark'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.core_exam_set_question_hidden(
      '40000000-0000-0000-0000-000000000001',
      true
    )
  $$,
  '42501',
  null,
  'a user outside the space cannot hide its questions'
);

select * from finish();

rollback;
