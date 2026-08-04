begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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

insert into public.core_exam_assets (
  id,
  space_id,
  uploader_id,
  visibility,
  title,
  original_filename,
  mime_type,
  byte_size,
  checksum_sha256,
  asset_role,
  system_managed
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'group',
    'Core Energetics',
    'core-energetics.pdf',
    'application/pdf',
    100,
    repeat('a', 64),
    'canonical_source',
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'private',
    'Private member file',
    'private.pdf',
    'application/pdf',
    100,
    repeat('b', 64),
    'member_upload',
    false
  );

insert into public.core_exam_asset_versions (
  id,
  asset_id,
  version_number,
  storage_bucket,
  storage_path,
  mime_type,
  byte_size,
  checksum_sha256,
  uploaded_by
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    1,
    'core-exam-files',
    'core-exam-1/system/sources/group/source.pdf',
    'application/pdf',
    100,
    repeat('a', 64),
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    1,
    'core-exam-files',
    'core-exam-1/member/private/source.pdf',
    'application/pdf',
    100,
    repeat('b', 64),
    '10000000-0000-0000-0000-000000000001'
  );

update public.core_exam_assets
set current_version_id = case id
  when '30000000-0000-0000-0000-000000000001'
    then '40000000-0000-0000-0000-000000000001'::uuid
  else '40000000-0000-0000-0000-000000000002'::uuid
end;

insert into public.core_exam_source_catalog (
  space_id,
  source_key,
  asset_id,
  author,
  category,
  document_type,
  viewer_kind,
  page_convention,
  provenance_note,
  sort_key
)
values (
  '20000000-0000-0000-0000-000000000001',
  'book.core-energetics',
  '30000000-0000-0000-0000-000000000001',
  'John C. Pierrakos',
  'books',
  'Book · PDF',
  'pdf',
  'PDF pages',
  'Private study source',
  '000100'
);

insert into storage.objects (bucket_id, name, metadata)
values
  (
    'core-exam-files',
    'core-exam-1/system/sources/group/source.pdf',
    '{"mimetype":"application/pdf","size":100}'::jsonb
  ),
  (
    'core-exam-files',
    'core-exam-1/member/private/source.pdf',
    '{"mimetype":"application/pdf","size":100}'::jsonb
  );

select throws_ok(
  $$
    update public.core_exam_asset_versions
    set byte_size = 101
    where id = '40000000-0000-0000-0000-000000000001'
  $$,
  '55000',
  'Core Exam asset versions are immutable',
  'asset versions cannot be updated'
);

select throws_ok(
  $$
    delete from public.core_exam_asset_versions
    where id = '40000000-0000-0000-0000-000000000001'
  $$,
  '55000',
  'Core Exam asset versions are immutable',
  'asset versions cannot be deleted'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select results_eq(
  'select source_key from public.core_exam_source_catalog',
  array['book.core-energetics'::text],
  'an active member can read the system source catalog'
);

select results_eq(
  'select title from public.core_exam_assets order by title',
  array['Core Energetics'::text],
  'an active member sees group assets but not another user private asset'
);

select results_eq(
  'select version_number from public.core_exam_asset_versions',
  array[1],
  'an active member can read a visible asset version'
);

select results_eq(
  'select name from storage.objects order by name',
  array['core-exam-1/system/sources/group/source.pdf'::text],
  'storage object reads mirror asset visibility'
);

select throws_ok(
  $$
    insert into public.core_exam_assets (
      space_id,
      uploader_id,
      title,
      original_filename,
      mime_type,
      byte_size,
      checksum_sha256,
      asset_role
    )
    values (
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'Unauthorized',
      'unauthorized.pdf',
      'application/pdf',
      100,
      repeat('c', 64),
      'member_upload'
    )
  $$,
  '42501',
  null,
  'members cannot bypass the future controlled upload path'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_source_catalog',
  array[0],
  'a non-member cannot read source catalog metadata'
);

select results_eq(
  'select count(*)::integer from public.core_exam_assets',
  array[0],
  'a non-member cannot discover asset metadata'
);

select results_eq(
  $$
    select count(*)::integer
    from storage.objects
    where bucket_id = 'core-exam-files'
  $$,
  array[0],
  'a non-member cannot discover private storage objects'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select results_eq(
  'select count(*)::integer from public.core_exam_assets',
  array[2],
  'an uploader sees their group and private assets'
);

reset role;
set local role anon;

select results_eq(
  'select count(*)::integer from public.core_exam_source_catalog',
  array[0],
  'anonymous users cannot read source metadata'
);

select * from finish();

rollback;
