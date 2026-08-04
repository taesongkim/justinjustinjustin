begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'owner@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'member@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'suspended@example.test'),
  ('10000000-0000-0000-0000-000000000004', 'outsider@example.test');

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

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.core_exam_record_verification(
      '30000000-0000-0000-0000-000000000001',
      'verified',
      'Checked against the source.'
    )
  $$,
  'an active member can append a verification event'
);

select results_eq(
  $$
    select actor_id::text || ':' || state::text || ':' || note
    from public.core_exam_verification_events
  $$,
  array[
    '10000000-0000-0000-0000-000000000002:verified:Checked against the source.'
  ],
  'the verification actor is derived from the authenticated user'
);

select lives_ok(
  $$
    select public.core_exam_record_verification(
      '30000000-0000-0000-0000-000000000001',
      'flagged',
      'Needs a second source.'
    )
  $$,
  'a member can append a later verification state'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_verification_events newer
    join public.core_exam_verification_events older
      on older.id = newer.prior_event_id
    where newer.state = 'flagged'
      and older.state = 'verified'
  $$,
  array[1],
  'each later event links to the prior event for the same content node'
);

select throws_ok(
  $$
    insert into public.core_exam_verification_events (
      space_id,
      content_node_id,
      state,
      actor_id
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      'verified',
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  null,
  'clients cannot insert verification events or spoof actors directly'
);

select results_eq(
  $$
    update public.core_exam_verification_events
    set state = 'unverified'
    returning state::text
  $$,
  array[]::text[],
  'verification history is immutable'
);

select lives_ok(
  $$
    select public.core_exam_create_contribution(
      '30000000-0000-0000-0000-000000000001',
      'note',
      'group',
      '{"type":"doc","content":[]}'::jsonb,
      'A shared note.',
      'Initial note'
    )
  $$,
  'an active member can create a group note'
);

select results_eq(
  $$
    select author_id::text || ':' || visibility::text || ':' || kind::text
    from public.core_exam_contributions
    where visibility = 'group'
  $$,
  array['10000000-0000-0000-0000-000000000002:group:note'],
  'the contribution author is derived from the authenticated user'
);

select lives_ok(
  $$
    select public.core_exam_create_contribution(
      '30000000-0000-0000-0000-000000000001',
      'definition',
      'private',
      '{"type":"doc","content":[]}'::jsonb,
      'A private definition.',
      null
    )
  $$,
  'an active member can create a private definition'
);

select results_eq(
  'select count(*)::integer from public.core_exam_contributions',
  array[2],
  'an author sees their group and private contributions'
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
    select plain_text
    from public.core_exam_contribution_revisions revision
    join public.core_exam_contributions contribution
      on contribution.current_revision_id = revision.id
    order by plain_text
  $$,
  array['A shared note.'::text],
  'another active member sees the current group contribution'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_contributions
    where visibility = 'private'
  $$,
  array[0],
  'another active member cannot see a private contribution'
);

select results_eq(
  'select count(*)::integer from public.core_exam_contribution_revisions',
  array[1],
  'private contribution revisions are also hidden from other members'
);

select throws_ok(
  $$
    select public.core_exam_save_contribution_revision(
      (
        select id
        from public.core_exam_contributions
        where visibility = 'group'
      ),
      (
        select current_revision_id
        from public.core_exam_contributions
        where visibility = 'group'
      ),
      'group',
      '{"type":"doc","content":[]}'::jsonb,
      'Owner tried to edit.',
      null
    )
  $$,
  '42501',
  null,
  'a group-visible contribution is editable only by its author'
);

select lives_ok(
  $$
    select public.core_exam_record_verification(
      '30000000-0000-0000-0000-000000000001',
      'verified',
      null
    )
  $$,
  'another active member can add to shared verification history'
);

select results_eq(
  'select count(*)::integer from public.core_exam_verification_events',
  array[3],
  'active members see the shared verification history'
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
    select public.core_exam_record_verification(
      '30000000-0000-0000-0000-000000000001',
      'verified',
      null
    )
  $$,
  '42501',
  null,
  'a user outside the space cannot verify its content'
);

select throws_ok(
  $$
    select public.core_exam_create_contribution(
      '30000000-0000-0000-0000-000000000001',
      'note',
      'group',
      '{}'::jsonb,
      'Unauthorized note.',
      null
    )
  $$,
  '42501',
  null,
  'a user outside the space cannot contribute to it'
);

select results_eq(
  'select count(*)::integer from public.core_exam_verification_events',
  array[0],
  'a user outside the space cannot read verification history'
);

select results_eq(
  'select count(*)::integer from public.core_exam_contributions',
  array[0],
  'a user outside the space cannot read its contributions'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.core_exam_record_verification(
      '30000000-0000-0000-0000-000000000001',
      'verified',
      null
    )
  $$,
  '42501',
  null,
  'a suspended member cannot append verification history'
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
    select public.core_exam_save_contribution_revision(
      (
        select id
        from public.core_exam_contributions
        where visibility = 'private'
      ),
      (
        select current_revision_id
        from public.core_exam_contributions
        where visibility = 'private'
      ),
      'group',
      '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
      'Now shared.',
      'Share with the group'
    )
  $$,
  'an author can revise a contribution and change its visibility'
);

select results_eq(
  $$
    select count(*)::integer
    from public.core_exam_contribution_revisions revision
    join public.core_exam_contributions contribution
      on contribution.id = revision.contribution_id
    where contribution.kind = 'definition'
  $$,
  array[2],
  'saving preserves immutable contribution revision history'
);

select throws_ok(
  $$
    select public.core_exam_save_contribution_revision(
      (
        select id
        from public.core_exam_contributions
        where kind = 'definition'
      ),
      (
        select based_on_revision_id
        from public.core_exam_contribution_revisions
        where based_on_revision_id is not null
      ),
      'group',
      '{}'::jsonb,
      'Stale write.',
      null
    )
  $$,
  '40001',
  null,
  'a stale revision cannot overwrite a newer contribution revision'
);

select results_eq(
  $$
    update public.core_exam_contribution_revisions
    set plain_text = 'Mutated history.'
    returning plain_text
  $$,
  array[]::text[],
  'contribution revision history is immutable to clients'
);

select results_eq(
  $$
    update public.core_exam_contributions
    set visibility = 'private'
    returning visibility::text
  $$,
  array[]::text[],
  'contribution metadata can change only through the controlled RPC'
);

select throws_ok(
  $$
    select public.core_exam_create_contribution(
      '30000000-0000-0000-0000-000000000002',
      'note',
      'group',
      '{}'::jsonb,
      'Cross-space note.',
      null
    )
  $$,
  '42501',
  null,
  'an active member cannot contribute to a different space'
);

select * from finish();

rollback;
