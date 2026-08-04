begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email)
values
  ('91000000-0000-0000-0000-000000000001', 'contribution-owner@example.test'),
  ('91000000-0000-0000-0000-000000000002', 'contribution-member@example.test');

insert into public.core_exam_spaces (id, slug, title)
values (
  '92000000-0000-0000-0000-000000000001',
  'contribution-activity',
  'Contribution Activity'
);

insert into public.core_exam_memberships (space_id, user_id, role, status)
values
  (
    '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000002',
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
  '93000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001',
  'topic-01.claim.contribution-activity',
  'claim',
  '001',
  '91000000-0000-0000-0000-000000000001'
);

select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_create_contribution(
      '93000000-0000-0000-0000-000000000001',
      'note',
      'group',
      '{"type":"doc","content":[]}'::jsonb,
      'A group note.',
      null
    )
  $$,
  'creating a contribution logs activity through the controlled RPC'
);

select results_eq(
  $$
    select action::text
    from public.core_exam_activity_events
  $$,
  array['contribution_created'],
  'the first contribution revision logs a created action'
);

select results_eq(
  $$
    select content_node_id::text
    from public.core_exam_activity_events
  $$,
  array['93000000-0000-0000-0000-000000000001'],
  'contribution activity targets the exact canonical content node'
);

select results_eq(
  $$
    select metadata ->> 'kind'
    from public.core_exam_activity_events
  $$,
  array['note'],
  'contribution activity preserves its kind'
);

select lives_ok(
  $$
    select public.core_exam_save_contribution_revision(
      (
        select id
        from public.core_exam_contributions
        limit 1
      ),
      (
        select current_revision_id
        from public.core_exam_contributions
        limit 1
      ),
      'private',
      '{"type":"doc","content":[]}'::jsonb,
      'A private revision.',
      null
    )
  $$,
  'editing a contribution logs a visibility-aware update'
);

select results_eq(
  $$
    select action::text
    from public.core_exam_activity_events
    order by case action
      when 'contribution_created' then 1
      when 'contribution_updated' then 2
    end
  $$,
  array['contribution_created', 'contribution_updated'],
  'later revisions log updated activity without replacing history'
);

select results_eq(
  $$
    select visibility::text
    from public.core_exam_activity_events
    order by case action
      when 'contribution_created' then 1
      when 'contribution_updated' then 2
    end
  $$,
  array['private', 'private'],
  'making a contribution private withdraws its prior group activity'
);

select results_eq(
  $$
    select distinct visibility_owner_id::text
    from public.core_exam_activity_events
  $$,
  array['91000000-0000-0000-0000-000000000002'],
  'withdrawn contribution activity remains available to its author'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select results_eq(
  $$
    select action::text
    from public.core_exam_activity_events
    order by created_at, id
  $$,
  array[]::text[],
  'another member cannot infer prior activity after the target becomes private'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_contributions
  $$,
  array[0],
  'another member cannot read the contribution after it becomes private'
);

select * from finish();
rollback;
