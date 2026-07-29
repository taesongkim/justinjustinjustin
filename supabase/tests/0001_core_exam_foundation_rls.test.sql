begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'owner@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'member@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'suspended@example.test'),
  ('10000000-0000-0000-0000-000000000004', 'outsider@example.test');

insert into public.core_exam_profiles (user_id, display_name, avatar_color)
values
  ('10000000-0000-0000-0000-000000000001', 'Owner', '#5b8def'),
  ('10000000-0000-0000-0000-000000000002', 'Member', '#ef8d5b'),
  ('10000000-0000-0000-0000-000000000003', 'Suspended', '#888888'),
  ('10000000-0000-0000-0000-000000000004', 'Outsider', '#555555');

insert into public.core_exam_spaces (id, slug, title)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'core-exam-1',
    'Core Exam 1'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'other-space',
    'Other Space'
  );

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
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'member',
    'suspended'
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
    'topic-01.private-other-space',
    'topic',
    '001',
    '10000000-0000-0000-0000-000000000004'
  );

set local role anon;

select results_eq(
  'select count(*)::integer from public.core_exam_spaces',
  array[0],
  'anonymous users cannot see Core Exam spaces'
);

select results_eq(
  'select count(*)::integer from public.core_exam_content_nodes',
  array[0],
  'anonymous users cannot see canonical content'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
set local role authenticated;

select results_eq(
  'select slug from public.core_exam_spaces order by slug',
  array['other-space'::text],
  'an authenticated user sees only spaces where they are active'
);

select results_eq(
  'select stable_key from public.core_exam_content_nodes order by stable_key',
  array['topic-01.private-other-space'::text],
  'an authenticated user cannot read another space canonical content'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_spaces',
  array[0],
  'a suspended member cannot see the space'
);

select results_eq(
  'select count(*)::integer from public.core_exam_content_nodes',
  array[0],
  'a suspended member cannot see canonical content'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select results_eq(
  'select slug from public.core_exam_spaces order by slug',
  array['core-exam-1'::text],
  'an active member sees their Core Exam space'
);

select results_eq(
  'select display_name from public.core_exam_profiles order by display_name',
  array['Member'::text, 'Owner'::text],
  'an active member sees active profiles in the shared space'
);

select results_eq(
  'select stable_key from public.core_exam_content_nodes order by stable_key',
  array['topic-01.mask-lower-higher'::text],
  'an active member sees canonical content in the shared space'
);

select throws_ok(
  $$
    insert into public.core_exam_content_nodes (
      space_id,
      stable_key,
      kind,
      sort_key,
      created_by
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      'topic-99.unauthorized',
      'topic',
      '999',
      '10000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'members cannot bypass the future canonical-write RPC'
);

select throws_ok(
  $$
    insert into public.core_exam_memberships (
      space_id,
      user_id,
      role,
      status
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000004',
      'member',
      'active'
    )
  $$,
  '42501',
  null,
  'members cannot add memberships directly'
);

select lives_ok(
  $$
    update public.core_exam_profiles
    set display_name = 'Member Updated'
    where user_id = '10000000-0000-0000-0000-000000000002'
  $$,
  'a member can update their own profile'
);

select results_eq(
  $$
    update public.core_exam_profiles
    set display_name = 'Wrong'
    where user_id = '10000000-0000-0000-0000-000000000001'
    returning display_name
  $$,
  array[]::text[],
  'a member cannot update another profile'
);

select results_eq(
  $$
    update public.core_exam_spaces
    set title = 'Wrong'
    where id = '20000000-0000-0000-0000-000000000001'
    returning title
  $$,
  array[]::text[],
  'a non-owner member cannot update the space'
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
    update public.core_exam_spaces
    set title = 'Core Exam 1 Updated'
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  'an active owner can update the space'
);

reset role;

select throws_ok(
  $$
    insert into public.core_exam_content_nodes (
      space_id,
      stable_key,
      kind,
      parent_id,
      sort_key,
      created_by
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      'topic-13.cross-space-parent',
      'topic',
      '30000000-0000-0000-0000-000000000002',
      '013',
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  '23503',
  null,
  'content parents cannot cross study spaces'
);

select throws_ok(
  $$
    insert into public.core_exam_content_aliases (
      space_id,
      old_stable_key,
      node_id,
      created_by
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      'topic-01.bad-alias',
      '30000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  '23503',
  null,
  'content aliases cannot cross study spaces'
);

select * from finish();

rollback;
