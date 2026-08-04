begin;

create type public.core_exam_asset_visibility as enum ('group', 'private');
create type public.core_exam_asset_role as enum (
  'canonical_source',
  'member_upload'
);

create table public.core_exam_assets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  uploader_id uuid not null references auth.users(id),
  visibility public.core_exam_asset_visibility not null default 'group',
  title text not null check (char_length(title) between 1 and 240),
  description text check (char_length(description) <= 2000),
  original_filename text not null check (
    char_length(original_filename) between 1 and 255
  ),
  mime_type text not null check (char_length(mime_type) between 3 and 120),
  byte_size bigint not null check (byte_size > 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  current_version_id uuid,
  asset_role public.core_exam_asset_role not null,
  system_managed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, space_id),
  check (
    not system_managed
    or (
      asset_role = 'canonical_source'
      and visibility = 'group'
    )
  )
);

create index core_exam_assets_space_role_title_idx
  on public.core_exam_assets (space_id, asset_role, title);

create table public.core_exam_asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.core_exam_assets(id),
  version_number integer not null check (version_number > 0),
  storage_bucket text not null check (
    storage_bucket = 'core-exam-files'
  ),
  storage_path text not null unique check (
    storage_path like 'core-exam-1/%'
  ),
  mime_type text not null check (char_length(mime_type) between 3 and 120),
  byte_size bigint not null check (byte_size > 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (asset_id, version_number),
  unique (id, asset_id)
);

alter table public.core_exam_assets
  add constraint core_exam_assets_current_version_fk
  foreign key (current_version_id, id)
  references public.core_exam_asset_versions(id, asset_id);

create table public.core_exam_source_catalog (
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  source_key text not null check (
    source_key ~ '^[a-z0-9]+(?:[.-][a-z0-9]+)*$'
  ),
  asset_id uuid not null unique references public.core_exam_assets(id),
  author text not null check (char_length(author) between 1 and 240),
  category text not null check (
    category in (
      'books',
      'lectures',
      'school-notes',
      'canonical-documents',
      'migration-evidence'
    )
  ),
  document_type text not null check (
    char_length(document_type) between 1 and 80
  ),
  viewer_kind text not null check (viewer_kind in ('pdf', 'text')),
  page_convention text check (char_length(page_convention) <= 240),
  pdf_page_offset integer,
  provenance_note text check (char_length(provenance_note) <= 1000),
  sort_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (space_id, source_key),
  foreign key (asset_id, space_id)
    references public.core_exam_assets(id, space_id)
);

create index core_exam_source_catalog_space_sort_idx
  on public.core_exam_source_catalog (space_id, sort_key);

create or replace function public.core_exam_reject_asset_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Core Exam asset versions are immutable'
    using errcode = '55000';
end;
$$;

revoke all
on function public.core_exam_reject_asset_version_mutation()
from public;

create trigger core_exam_asset_versions_immutable
before update or delete
on public.core_exam_asset_versions
for each row
execute function public.core_exam_reject_asset_version_mutation();

alter table public.core_exam_assets enable row level security;
alter table public.core_exam_asset_versions enable row level security;
alter table public.core_exam_source_catalog enable row level security;

create policy core_exam_assets_select_visible
on public.core_exam_assets
for select
to authenticated
using (
  public.core_exam_is_active_member(space_id)
  and (
    visibility = 'group'
    or uploader_id = auth.uid()
  )
);

create policy core_exam_asset_versions_select_visible
on public.core_exam_asset_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.core_exam_assets asset
    where asset.id = core_exam_asset_versions.asset_id
      and public.core_exam_is_active_member(asset.space_id)
      and (
        asset.visibility = 'group'
        or asset.uploader_id = auth.uid()
      )
  )
);

create policy core_exam_source_catalog_select_member
on public.core_exam_source_catalog
for select
to authenticated
using (
  public.core_exam_is_active_member(space_id)
  and exists (
    select 1
    from public.core_exam_assets asset
    where asset.id = core_exam_source_catalog.asset_id
      and asset.archived_at is null
      and (
        asset.visibility = 'group'
        or asset.uploader_id = auth.uid()
      )
  )
);

grant select on public.core_exam_assets to authenticated;
grant select on public.core_exam_asset_versions to authenticated;
grant select on public.core_exam_source_catalog to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'core-exam-files',
  'core-exam-files',
  false,
  104857600,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]::text[]
)
on conflict (id) do nothing;

create or replace function public.core_exam_can_read_storage_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.core_exam_asset_versions version
    join public.core_exam_assets asset
      on asset.id = version.asset_id
    where version.storage_bucket = 'core-exam-files'
      and version.storage_path = object_name
      and asset.archived_at is null
      and public.core_exam_is_active_member(asset.space_id)
      and (
        asset.visibility = 'group'
        or asset.uploader_id = auth.uid()
      )
  );
$$;

revoke all
on function public.core_exam_can_read_storage_object(text)
from public;
grant execute
on function public.core_exam_can_read_storage_object(text)
to authenticated;

create policy core_exam_storage_objects_select_visible
on storage.objects
for select
to authenticated
using (
  bucket_id = 'core-exam-files'
  and public.core_exam_can_read_storage_object(name)
);

commit;
