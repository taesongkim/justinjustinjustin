begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email)
values
  ('b1000000-0000-0000-0000-000000000001', 'workshop-owner@example.test'),
  ('b1000000-0000-0000-0000-000000000002', 'workshop-member@example.test');

insert into public.core_exam_spaces (id, slug, title)
values (
  'b2000000-0000-0000-0000-000000000001',
  'core-exam-1',
  'Core Exam 1'
);

insert into public.core_exam_memberships (space_id, user_id, role, status)
values
  (
    'b2000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    'b2000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'member',
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
    'b3000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'topic-01.mask-lower-higher',
    'topic',
    '001',
    'b1000000-0000-0000-0000-000000000001'
  ),
  (
    'b3000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000001',
    'topic-02.images-real-false-needs',
    'topic',
    '002',
    'b1000000-0000-0000-0000-000000000001'
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
values
  (
    'b4000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000001',
    'question.q001',
    'curated',
    'What is the Lower Self?',
    1000
  ),
  (
    'b4000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000002',
    'question.q002',
    'curated',
    'What is a real need?',
    1000
  );

select set_config(
  'request.jwt.claim.sub',
  'b1000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_save_personal_answer(
      'b4000000-0000-0000-0000-000000000001',
      null,
      'group',
      '{"type":"doc","content":[]}'::jsonb,
      'A test answer.',
      null
    )
  $$,
  'a member can seed a test answer before workshop preview'
);

select lives_ok(
  $$
    select public.core_exam_add_comment(
      'b4000000-0000-0000-0000-000000000001',
      null,
      null,
      'A test question comment.'
    )
  $$,
  'a member can seed a test comment before workshop preview'
);

select lives_ok(
  $$
    select public.core_exam_set_question_likelihood(
      'b4000000-0000-0000-0000-000000000001',
      'likely'
    )
  $$,
  'a member can seed a likelihood mark before workshop preview'
);

select lives_ok(
  $$
    select public.core_exam_set_question_hidden(
      'b4000000-0000-0000-0000-000000000001',
      true
    )
  $$,
  'a member can seed a hidden mark before workshop preview'
);

select lives_ok(
  $$
    select public.core_exam_submit_question(
      'b3000000-0000-0000-0000-000000000001',
      'What should the group ask next?',
      null
    )
  $$,
  'a community question exists outside the curated reset'
);

select throws_ok(
  $$
    select public.core_exam_sync_curated_question_bank(
      '[]'::jsonb,
      false
    )
  $$,
  '42501',
  'Active Core Exam owner required',
  'a regular member cannot synchronize the curated bank'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  'b1000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_sync_curated_question_bank(
      '[
        {
          "stableKey": "question.q001",
          "topicStableKey": "topic-01.mask-lower-higher",
          "prompt": "How do the Lower Self and Mask differ?",
          "rank": 1000,
          "archived": false
        },
        {
          "stableKey": "question.custom.new",
          "topicStableKey": "topic-01.mask-lower-higher",
          "prompt": "What is the Higher Self?",
          "rank": 2000,
          "archived": false
        }
      ]'::jsonb,
      false
    )
  $$,
  'an owner can apply a non-destructive preview'
);

select results_eq(
  $$
    select prompt
    from public.core_exam_questions
    where stable_key = 'question.q001'
  $$,
  array['How do the Lower Self and Mask differ?'::text],
  'preview rewrites a retained question without changing its identity'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_answers
    where question_id = 'b4000000-0000-0000-0000-000000000001'
  $$,
  array[1],
  'preview preserves existing test collaboration'
);

select lives_ok(
  $$
    select public.core_exam_sync_curated_question_bank(
      '[
        {
          "stableKey": "question.q001",
          "topicStableKey": "topic-01.mask-lower-higher",
          "prompt": "How do the Lower Self and Mask differ?",
          "rank": 1000,
          "archived": false
        },
        {
          "stableKey": "question.custom.new",
          "topicStableKey": "topic-01.mask-lower-higher",
          "prompt": "What is the Higher Self?",
          "rank": 2000,
          "archived": false
        }
      ]'::jsonb,
      true
    )
  $$,
  'an owner can finalize with the approved clean reset'
);

select results_eq(
  $$
    select
      (select count(*) from public.core_exam_answers answer
        join public.core_exam_questions question
          on question.id = answer.question_id
        where question.origin = 'curated')::integer,
      (select count(*) from public.core_exam_comments comment
        join public.core_exam_questions question
          on question.id = comment.question_id
        where question.origin = 'curated')::integer,
      (select count(*) from public.core_exam_question_likelihood_marks mark
        join public.core_exam_questions question
          on question.id = mark.question_id
        where question.origin = 'curated')::integer,
      (select count(*) from public.core_exam_question_hidden_marks mark
        join public.core_exam_questions question
          on question.id = mark.question_id
        where question.origin = 'curated')::integer
  $$,
  $$
    values (0, 0, 0, 0)
  $$,
  'finalization clears curated answers, comments, likelihood, and hidden marks'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_questions
    where origin = 'submitted'
      and archived_at is null
  $$,
  array[1],
  'finalization leaves community-submitted questions untouched'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_activity_events event
    join public.core_exam_questions question
      on question.id = event.question_id
    where question.origin = 'curated'
  $$,
  array[0],
  'finalization clears activity attached to curated questions'
);

select * from finish();
rollback;
