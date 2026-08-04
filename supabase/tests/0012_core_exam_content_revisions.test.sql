begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'owner@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'member@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'outsider@example.test');

insert into public.core_exam_profiles (user_id, display_name, avatar_color)
values
  ('10000000-0000-0000-0000-000000000001', 'Owner', '#5b8def'),
  ('10000000-0000-0000-0000-000000000002', 'Member', '#ef8d5b'),
  ('10000000-0000-0000-0000-000000000003', 'Outsider', '#555555');

insert into public.core_exam_spaces (id, slug, title)
values (
  '20000000-0000-0000-0000-000000000001',
  'core-exam-1',
  'Core Exam 1'
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

insert into public.core_exam_content_revisions (
  id,
  node_id,
  revision_number,
  schema_version,
  body,
  plain_text,
  body_sha256,
  edit_summary,
  edited_by
)
values (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  1,
  'core-exam-v1',
  jsonb_build_object(
    'type',
    'canonical-markdown',
    'markdown',
    '# Mask, Lower Self, Higher Self'
  ),
  'Mask, Lower Self, Higher Self',
  repeat('a', 64),
  'Initial canonical import',
  '10000000-0000-0000-0000-000000000001'
);

update public.core_exam_content_nodes
set current_revision_id = '40000000-0000-0000-0000-000000000001'
where id = '30000000-0000-0000-0000-000000000001';

select throws_ok(
  $$
    update public.core_exam_content_revisions
    set plain_text = 'Mutated'
    where id = '40000000-0000-0000-0000-000000000001'
  $$,
  '55000',
  'Canonical content revisions are immutable',
  'canonical revisions cannot be updated, including by privileged importers'
);

select throws_ok(
  $$
    delete from public.core_exam_content_revisions
    where id = '40000000-0000-0000-0000-000000000001'
  $$,
  '55000',
  'Canonical content revisions are immutable',
  'canonical revisions cannot be deleted, including by privileged importers'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select results_eq(
  $$
    select body ->> 'markdown'
    from public.core_exam_content_revisions
  $$,
  array['# Mask, Lower Self, Higher Self'::text],
  'an active member can read the current canonical Markdown revision'
);

select throws_ok(
  $$
    insert into public.core_exam_content_revisions (
      node_id,
      revision_number,
      schema_version,
      body,
      plain_text,
      body_sha256,
      edited_by
    )
    values (
      '30000000-0000-0000-0000-000000000001',
      2,
      'core-exam-v1',
      '{"type":"canonical-markdown","markdown":"unauthorized"}',
      'unauthorized',
      repeat('b', 64),
      '10000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'members cannot insert canonical revisions directly'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_content_revisions',
  array[0],
  'a non-member cannot read canonical revisions'
);

select results_eq(
  'select count(*)::integer from public.core_exam_content_nodes',
  array[0],
  'a non-member cannot discover canonical content nodes'
);

select * from finish();

rollback;
