begin;

create type public.core_exam_membership_role as enum ('owner', 'member');
create type public.core_exam_membership_status as enum ('active', 'suspended');
create type public.core_exam_content_kind as enum (
  'page',
  'topic',
  'section',
  'claim',
  'definition',
  'chart',
  'chart_row',
  'table',
  'source_excerpt',
  'reference_entry'
);

create table public.core_exam_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_color text not null check (
    avatar_color ~ '^#[0-9a-fA-F]{6}$'
  ),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.core_exam_spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.core_exam_memberships (
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.core_exam_membership_role not null default 'member',
  status public.core_exam_membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create index core_exam_memberships_user_status_idx
  on public.core_exam_memberships (user_id, status);

create or replace function public.core_exam_is_active_member(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.core_exam_memberships membership
    where membership.space_id = target_space_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.core_exam_is_owner(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.core_exam_memberships membership
    where membership.space_id = target_space_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner'
  );
$$;

revoke all on function public.core_exam_is_active_member(uuid) from public;
revoke all on function public.core_exam_is_owner(uuid) from public;
grant execute on function public.core_exam_is_active_member(uuid) to authenticated;
grant execute on function public.core_exam_is_owner(uuid) to authenticated;

create table public.core_exam_content_nodes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  stable_key text not null check (
    stable_key ~ '^[a-z0-9]+(?:[.-][a-z0-9]+)*$'
  ),
  kind public.core_exam_content_kind not null,
  parent_id uuid,
  sort_key text not null,
  current_revision_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (space_id, stable_key),
  unique (id, space_id)
);

alter table public.core_exam_content_nodes
  add constraint core_exam_content_nodes_parent_space_fk
  foreign key (parent_id, space_id)
  references public.core_exam_content_nodes(id, space_id);

create index core_exam_content_nodes_parent_sort_idx
  on public.core_exam_content_nodes (parent_id, sort_key);

create table public.core_exam_content_revisions (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.core_exam_content_nodes(id),
  revision_number integer not null check (revision_number > 0),
  schema_version text not null check (schema_version = 'core-exam-v1'),
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  plain_text text not null,
  body_sha256 text not null check (body_sha256 ~ '^[a-f0-9]{64}$'),
  edit_summary text check (char_length(edit_summary) <= 500),
  edited_by uuid not null references auth.users(id),
  based_on_revision_id uuid,
  created_at timestamptz not null default now(),
  unique (node_id, revision_number),
  unique (id, node_id)
);

alter table public.core_exam_content_revisions
  add constraint core_exam_content_revisions_base_node_fk
  foreign key (based_on_revision_id, node_id)
  references public.core_exam_content_revisions(id, node_id);

alter table public.core_exam_content_nodes
  add constraint core_exam_content_nodes_current_revision_fk
  foreign key (current_revision_id, id)
  references public.core_exam_content_revisions(id, node_id);

create table public.core_exam_content_aliases (
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  old_stable_key text not null check (
    old_stable_key ~ '^[a-z0-9]+(?:[.-][a-z0-9]+)*$'
  ),
  node_id uuid not null references public.core_exam_content_nodes(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (space_id, old_stable_key),
  foreign key (node_id, space_id)
    references public.core_exam_content_nodes(id, space_id)
);

alter table public.core_exam_profiles enable row level security;
alter table public.core_exam_spaces enable row level security;
alter table public.core_exam_memberships enable row level security;
alter table public.core_exam_content_nodes enable row level security;
alter table public.core_exam_content_revisions enable row level security;
alter table public.core_exam_content_aliases enable row level security;

create policy core_exam_profiles_select
on public.core_exam_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.core_exam_memberships viewer_membership
    join public.core_exam_memberships profile_membership
      on profile_membership.space_id = viewer_membership.space_id
    where viewer_membership.user_id = auth.uid()
      and viewer_membership.status = 'active'
      and profile_membership.user_id = core_exam_profiles.user_id
      and profile_membership.status = 'active'
  )
);

create policy core_exam_profiles_insert_self
on public.core_exam_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy core_exam_profiles_update_self
on public.core_exam_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy core_exam_spaces_select_member
on public.core_exam_spaces
for select
to authenticated
using (public.core_exam_is_active_member(id));

create policy core_exam_spaces_update_owner
on public.core_exam_spaces
for update
to authenticated
using (public.core_exam_is_owner(id))
with check (public.core_exam_is_owner(id));

create policy core_exam_memberships_select_member
on public.core_exam_memberships
for select
to authenticated
using (public.core_exam_is_active_member(space_id));

create policy core_exam_content_nodes_select_member
on public.core_exam_content_nodes
for select
to authenticated
using (public.core_exam_is_active_member(space_id));

create policy core_exam_content_revisions_select_member
on public.core_exam_content_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.core_exam_content_nodes node
    where node.id = core_exam_content_revisions.node_id
      and public.core_exam_is_active_member(node.space_id)
  )
);

create policy core_exam_content_aliases_select_member
on public.core_exam_content_aliases
for select
to authenticated
using (public.core_exam_is_active_member(space_id));

grant select, insert, update on public.core_exam_profiles to authenticated;
grant select, update on public.core_exam_spaces to authenticated;
grant select on public.core_exam_memberships to authenticated;
grant select on public.core_exam_content_nodes to authenticated;
grant select on public.core_exam_content_revisions to authenticated;
grant select on public.core_exam_content_aliases to authenticated;

commit;
