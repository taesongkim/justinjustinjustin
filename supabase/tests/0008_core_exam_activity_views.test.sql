begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email)
values
  ('81000000-0000-0000-0000-000000000001', 'activity-owner@example.test'),
  ('81000000-0000-0000-0000-000000000002', 'activity-member@example.test'),
  ('81000000-0000-0000-0000-000000000003', 'activity-outsider@example.test');

insert into public.core_exam_spaces (id, slug, title)
values (
  '82000000-0000-0000-0000-000000000001',
  'core-exam-1',
  'Core Exam 1'
);

insert into public.core_exam_memberships (space_id, user_id, role, status)
values
  (
    '82000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    '82000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000002',
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
values (
  '83000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  'topic-01.activity-view',
  'topic',
  '001',
  '81000000-0000-0000-0000-000000000001'
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
  '84000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000001',
  'question.activity-view',
  'curated',
  'What has changed?',
  1000
);

insert into public.core_exam_activity_events (
  id,
  space_id,
  actor_id,
  action,
  question_id,
  visibility,
  created_at
)
values (
  '85000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  'likelihood_marked',
  '84000000-0000-0000-0000-000000000001',
  'group',
  '2026-07-29 12:00:00+00'
);

insert into public.core_exam_activity_events (
  id,
  space_id,
  actor_id,
  action,
  question_id,
  visibility,
  visibility_owner_id,
  created_at
)
values (
  '85000000-0000-0000-0000-000000000002',
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  'answer_updated',
  '84000000-0000-0000-0000-000000000001',
  'private',
  '81000000-0000-0000-0000-000000000001',
  '2026-07-29 13:00:00+00'
);

insert into public.core_exam_activity_events (
  id,
  space_id,
  actor_id,
  action,
  question_id,
  visibility,
  created_at
)
values (
  '85000000-0000-0000-0000-000000000003',
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000002',
  'likelihood_marked',
  '84000000-0000-0000-0000-000000000001',
  'group',
  '2026-07-29 14:00:00+00'
);

select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  'select public.core_exam_mark_activity_viewed()',
  'an active member can mark visible activity viewed'
);

select results_eq(
  $$
    select last_viewed_event_id::text
    from public.core_exam_activity_views
  $$,
  array['85000000-0000-0000-0000-000000000001'],
  'a member marker ignores their own newer event and private activity'
);

select results_eq(
  $$
    select user_id::text
    from public.core_exam_activity_views
  $$,
  array['81000000-0000-0000-0000-000000000002'],
  'the RPC derives the viewer from authentication'
);

select lives_ok(
  'select public.core_exam_mark_activity_viewed()',
  'marking activity viewed is idempotent'
);

select results_eq(
  'select count(*)::integer from public.core_exam_activity_views',
  array[1],
  'reopening activity updates one durable marker'
);

select throws_ok(
  $$
    insert into public.core_exam_activity_views (
      space_id,
      user_id,
      last_viewed_event_id
    )
    values (
      '82000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000001',
      '85000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'clients cannot write or spoof activity view markers directly'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  'select public.core_exam_mark_activity_viewed()',
  'the owner can mark their visible activity viewed'
);

select results_eq(
  $$
    select last_viewed_event_id::text
    from public.core_exam_activity_views
    where user_id = '81000000-0000-0000-0000-000000000001'
  $$,
  array['85000000-0000-0000-0000-000000000003'],
  'the owner marker tracks the latest event created by another member'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select throws_ok(
  'select public.core_exam_mark_activity_viewed()',
  '42501',
  null,
  'a non-member cannot mark Core Exam activity viewed'
);

select results_eq(
  'select count(*)::integer from public.core_exam_activity_views',
  array[0],
  'a non-member cannot read activity view markers'
);

select * from finish();
rollback;
