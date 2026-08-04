begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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

select results_eq(
  'select count(*)::integer from public.core_exam_activity_events',
  array[0],
  'seeding a curated question does not create member activity'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_submit_question(
      '30000000-0000-0000-0000-000000000001',
      'How does this differ from the Mask?',
      null
    )
  $$,
  'submitting a question creates activity'
);

select results_eq(
  $$
    select actor_id::text || ':' || action::text
    from public.core_exam_activity_events
  $$,
  array[
    '10000000-0000-0000-0000-000000000002:question_submitted'
  ],
  'question activity derives the authenticated actor'
);

select lives_ok(
  $$
    select public.core_exam_save_personal_answer(
      '40000000-0000-0000-0000-000000000001',
      null,
      'group',
      '{}'::jsonb,
      'My first answer.',
      null
    )
  $$,
  'creating a group answer creates activity'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_activity_events
    where action = 'answer_created'
      and visibility = 'group'
  $$,
  array[1],
  'new answer activity carries group visibility'
);

select lives_ok(
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
      'My revised answer.',
      null
    )
  $$,
  'revising an answer creates a distinct activity event'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_activity_events
    where action = 'answer_updated'
  $$,
  array[1],
  'answer updates are distinguished from creation'
);

select lives_ok(
  $$
    select public.core_exam_add_comment(
      null,
      (
        select id
        from public.core_exam_answers
        where author_id = '10000000-0000-0000-0000-000000000002'
      ),
      null,
      'A discussion comment.'
    );
    select public.core_exam_set_question_likelihood(
      '40000000-0000-0000-0000-000000000001',
      'likely'
    );
    select public.core_exam_set_question_hidden(
      '40000000-0000-0000-0000-000000000001',
      true
    );
    select public.core_exam_set_question_hidden(
      '40000000-0000-0000-0000-000000000001',
      false
    )
  $$,
  'comments, likelihood, hide, and restore create durable activity'
);

select results_eq(
  $$
    select action::text
    from public.core_exam_activity_events
    order by action::text
  $$,
  array[
    'answer_created'::text,
    'answer_updated'::text,
    'comment_added'::text,
    'likelihood_marked'::text,
    'question_hidden'::text,
    'question_shown'::text,
    'question_submitted'::text
  ],
  'the global feed records every approved first-version action'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_save_personal_answer(
      '40000000-0000-0000-0000-000000000001',
      null,
      'private',
      '{}'::jsonb,
      'Owner private answer.',
      null
    )
  $$,
  'private answer activity is recorded with private visibility'
);

select results_eq(
  'select count(*)::integer from public.core_exam_activity_events',
  array[8],
  'the private-answer owner sees group and private activity'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_activity_events',
  array[7],
  'another member cannot infer private-answer activity'
);

select throws_ok(
  $$
    insert into public.core_exam_activity_events (
      space_id,
      actor_id,
      action,
      question_id
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'comment_added',
      '40000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  null,
  'clients cannot forge activity events'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_activity_events',
  array[0],
  'a user outside the space cannot read global activity'
);

select * from finish();

rollback;
