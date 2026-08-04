begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email)
values
  ('a1000000-0000-0000-0000-000000000001', 'privacy-owner@example.test'),
  ('a1000000-0000-0000-0000-000000000002', 'privacy-member@example.test');

insert into public.core_exam_spaces (id, slug, title)
values (
  'a2000000-0000-0000-0000-000000000001',
  'privacy-transitions',
  'Privacy Transitions'
);

insert into public.core_exam_memberships (space_id, user_id, role, status)
values
  (
    'a2000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    'a2000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000002',
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
  'a3000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'topic-01.privacy-transitions',
  'topic',
  '001',
  'a1000000-0000-0000-0000-000000000001'
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
  'a4000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001',
  'question.privacy-transition',
  'curated',
  'How does privacy change activity?',
  1000
);

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_save_personal_answer(
      'a4000000-0000-0000-0000-000000000001',
      null,
      'group',
      '{"type":"doc","content":[]}'::jsonb,
      'Initially shared.',
      null
    )
  $$,
  'a member can create a group answer'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_add_comment(
      null,
      (
        select id
        from public.core_exam_answers
        where question_id = 'a4000000-0000-0000-0000-000000000001'
      ),
      null,
      'A comment on the shared answer.'
    )
  $$,
  'another member can comment while the answer is shared'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_save_personal_answer(
      'a4000000-0000-0000-0000-000000000001',
      (
        select current_revision_id
        from public.core_exam_answers
        where question_id = 'a4000000-0000-0000-0000-000000000001'
      ),
      'private',
      '{"type":"doc","content":[]}'::jsonb,
      'Now private.',
      null
    )
  $$,
  'the author can make their answer private'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_activity_events
    where answer_id = (
      select id
      from public.core_exam_answers
      where question_id = 'a4000000-0000-0000-0000-000000000001'
    )
      and visibility = 'private'
  $$,
  array[3],
  'answer, comment, and update activity all become private'
);

select results_eq(
  $$
    select count(distinct visibility_owner_id)::integer
    from public.core_exam_activity_events
    where answer_id = (
      select id
      from public.core_exam_answers
      where question_id = 'a4000000-0000-0000-0000-000000000001'
    )
      and visibility_owner_id =
        'a1000000-0000-0000-0000-000000000002'
  $$,
  array[1],
  'withdrawn activity remains assigned to the answer author'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_activity_events
    where answer_id is not null
  $$,
  array[0],
  'another member cannot read withdrawn answer activity'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_answers
  $$,
  array[0],
  'another member cannot read the private answer'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_comments
  $$,
  array[0],
  'another member cannot read comments whose answer became private'
);

select * from finish();
rollback;
