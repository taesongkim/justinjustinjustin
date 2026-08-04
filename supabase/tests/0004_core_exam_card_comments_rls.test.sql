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

insert into public.core_exam_answers (
  id,
  space_id,
  question_id,
  author_id,
  visibility
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'group'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'private'
  );

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_add_comment(
      '40000000-0000-0000-0000-000000000001',
      null,
      null,
      'A question-level comment.'
    )
  $$,
  'a member can comment on a question card'
);

select results_eq(
  $$
    select author_id::text
    from public.core_exam_comments
    where question_id is not null
  $$,
  array['10000000-0000-0000-0000-000000000002'::text],
  'the comment author is derived from auth'
);

select lives_ok(
  $$
    select public.core_exam_add_comment(
      null,
      '50000000-0000-0000-0000-000000000001',
      null,
      'A comment on the member answer.'
    )
  $$,
  'a member can comment on a visible answer'
);

select lives_ok(
  $$
    select public.core_exam_add_comment(
      '40000000-0000-0000-0000-000000000001',
      null,
      (
        select id
        from public.core_exam_comments
        where question_id is not null
          and parent_comment_id is null
      ),
      'One reply level works.'
    )
  $$,
  'a member can reply once within the question thread'
);

select throws_ok(
  $$
    select public.core_exam_add_comment(
      '40000000-0000-0000-0000-000000000001',
      null,
      (
        select id
        from public.core_exam_comments
        where parent_comment_id is not null
      ),
      'A nested reply.'
    )
  $$,
  '23514',
  null,
  'comments cannot nest beyond one reply level'
);

select throws_ok(
  $$
    select public.core_exam_add_comment(
      null,
      '50000000-0000-0000-0000-000000000001',
      (
        select id
        from public.core_exam_comments
        where question_id is not null
          and parent_comment_id is null
      ),
      'A reply on a different target.'
    )
  $$,
  '23514',
  null,
  'a reply cannot move to another card target'
);

select throws_ok(
  $$
    select public.core_exam_add_comment(
      null,
      '50000000-0000-0000-0000-000000000002',
      null,
      'A comment on another user private answer.'
    )
  $$,
  '42501',
  null,
  'another member cannot comment on a private answer'
);

select results_eq(
  'select count(*)::integer from public.core_exam_comments',
  array[3],
  'the member sees question and visible-answer comments'
);

select throws_ok(
  $$
    insert into public.core_exam_comments (
      space_id,
      question_id,
      author_id,
      body
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'Spoofed direct comment.'
    )
  $$,
  '42501',
  null,
  'clients cannot insert comments or spoof authors directly'
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
    select public.core_exam_add_comment(
      null,
      '50000000-0000-0000-0000-000000000002',
      null,
      'A comment on my private answer.'
    )
  $$,
  'an author can comment on their own private answer'
);

select results_eq(
  'select count(*)::integer from public.core_exam_comments',
  array[4],
  'the private-answer author sees all visible comments'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_comments',
  array[3],
  'private-answer comments remain hidden from another member'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_comments',
  array[0],
  'a user outside the space cannot read card comments'
);

select throws_ok(
  $$
    select public.core_exam_add_comment(
      '40000000-0000-0000-0000-000000000001',
      null,
      null,
      'An outsider comment.'
    )
  $$,
  '42501',
  null,
  'a user outside the space cannot comment'
);

select * from finish();

rollback;
