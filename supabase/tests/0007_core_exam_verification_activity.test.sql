begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email)
values
  ('71000000-0000-0000-0000-000000000001', 'owner-activity@example.test'),
  ('71000000-0000-0000-0000-000000000002', 'member-activity@example.test'),
  ('71000000-0000-0000-0000-000000000003', 'outsider-activity@example.test');

insert into public.core_exam_spaces (id, slug, title)
values (
  '72000000-0000-0000-0000-000000000001',
  'verification-activity-space',
  'Verification Activity'
);

insert into public.core_exam_memberships (space_id, user_id, role, status)
values
  (
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000002',
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
  '73000000-0000-0000-0000-000000000001',
  '72000000-0000-0000-0000-000000000001',
  'topic-01.claim.verification-activity',
  'claim',
  '001',
  '71000000-0000-0000-0000-000000000001'
);

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_record_verification(
      '73000000-0000-0000-0000-000000000001',
      'verified',
      'Checked against the source.'
    )
  $$,
  'recording verification creates activity without a client-side write'
);

select results_eq(
  $$
    select action::text
    from public.core_exam_activity_events
  $$,
  array['verification_changed'],
  'verification activity has its own action'
);

select results_eq(
  $$
    select content_node_id::text
    from public.core_exam_activity_events
  $$,
  array['73000000-0000-0000-0000-000000000001'],
  'verification activity targets the exact content node'
);

select results_eq(
  $$
    select actor_id::text
    from public.core_exam_activity_events
  $$,
  array['71000000-0000-0000-0000-000000000002'],
  'the verification actor is preserved on activity'
);

select results_eq(
  $$
    select metadata ->> 'state'
    from public.core_exam_activity_events
  $$,
  array['verified'],
  'activity metadata preserves the selected state'
);

select results_eq(
  $$
    select metadata ->> 'note'
    from public.core_exam_activity_events
  $$,
  array['Checked against the source.'],
  'activity metadata preserves the optional note'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_activity_events
    where question_id is null
      and content_node_id is not null
  $$,
  array[1],
  'content activity does not require a synthetic question target'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_activity_events',
  array[0],
  'a non-member cannot read verification activity'
);

select * from finish();
rollback;
