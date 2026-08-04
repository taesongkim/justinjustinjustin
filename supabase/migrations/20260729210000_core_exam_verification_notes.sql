begin;

create type public.core_exam_verification_state as enum (
  'verified',
  'flagged',
  'unverified'
);
create type public.core_exam_contribution_kind as enum ('note', 'definition');
create type public.core_exam_visibility as enum ('group', 'private');

create table public.core_exam_verification_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  content_node_id uuid not null,
  state public.core_exam_verification_state not null,
  actor_id uuid not null references auth.users(id),
  note text check (char_length(note) <= 2000),
  prior_event_id uuid,
  created_at timestamptz not null default now(),
  unique (id, content_node_id),
  foreign key (content_node_id, space_id)
    references public.core_exam_content_nodes(id, space_id),
  foreign key (prior_event_id, content_node_id)
    references public.core_exam_verification_events(id, content_node_id)
);

create index core_exam_verification_events_latest_idx
  on public.core_exam_verification_events (
    content_node_id,
    created_at desc,
    id desc
  );

create table public.core_exam_contributions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.core_exam_spaces(id) on delete cascade,
  kind public.core_exam_contribution_kind not null,
  target_node_id uuid not null,
  author_id uuid not null references auth.users(id),
  visibility public.core_exam_visibility not null default 'group',
  current_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, space_id),
  foreign key (target_node_id, space_id)
    references public.core_exam_content_nodes(id, space_id)
);

create index core_exam_contributions_target_idx
  on public.core_exam_contributions (target_node_id, created_at, id);

create table public.core_exam_contribution_revisions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null
    references public.core_exam_contributions(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  schema_version text not null check (schema_version = 'core-exam-v1'),
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  plain_text text not null,
  edit_summary text check (char_length(edit_summary) <= 500),
  edited_by uuid not null references auth.users(id),
  based_on_revision_id uuid,
  created_at timestamptz not null default now(),
  unique (contribution_id, revision_number),
  unique (id, contribution_id),
  foreign key (based_on_revision_id, contribution_id)
    references public.core_exam_contribution_revisions(id, contribution_id)
);

alter table public.core_exam_contributions
  add constraint core_exam_contributions_current_revision_fk
  foreign key (current_revision_id, id)
  references public.core_exam_contribution_revisions(id, contribution_id);

alter table public.core_exam_verification_events enable row level security;
alter table public.core_exam_contributions enable row level security;
alter table public.core_exam_contribution_revisions enable row level security;

create policy core_exam_verification_events_select_member
on public.core_exam_verification_events
for select
to authenticated
using (public.core_exam_is_active_member(space_id));

create policy core_exam_contributions_select_visible
on public.core_exam_contributions
for select
to authenticated
using (
  public.core_exam_is_active_member(space_id)
  and (
    visibility = 'group'
    or author_id = auth.uid()
  )
);

create policy core_exam_contribution_revisions_select_visible
on public.core_exam_contribution_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.core_exam_contributions contribution
    where contribution.id =
      core_exam_contribution_revisions.contribution_id
  )
);

create or replace function public.core_exam_record_verification(
  target_content_node_id uuid,
  new_state public.core_exam_verification_state,
  verification_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_space_id uuid;
  previous_event_id uuid;
  created_event_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(verification_note) > 2000 then
    raise exception 'Verification note is too long' using errcode = '22001';
  end if;

  select node.space_id
  into target_space_id
  from public.core_exam_content_nodes node
  where node.id = target_content_node_id
    and node.archived_at is null;

  if target_space_id is null
    or not public.core_exam_is_active_member(target_space_id)
  then
    raise exception 'Active space membership required'
      using errcode = '42501';
  end if;

  select event.id
  into previous_event_id
  from public.core_exam_verification_events event
  where event.content_node_id = target_content_node_id
  order by event.created_at desc, event.id desc
  limit 1
  for update;

  insert into public.core_exam_verification_events (
    space_id,
    content_node_id,
    state,
    actor_id,
    note,
    prior_event_id
  )
  values (
    target_space_id,
    target_content_node_id,
    new_state,
    caller_id,
    nullif(btrim(verification_note), ''),
    previous_event_id
  )
  returning id into created_event_id;

  return created_event_id;
end;
$$;

create or replace function public.core_exam_create_contribution(
  target_content_node_id uuid,
  contribution_kind public.core_exam_contribution_kind,
  contribution_visibility public.core_exam_visibility,
  contribution_body jsonb,
  contribution_plain_text text,
  contribution_edit_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_space_id uuid;
  created_contribution_id uuid;
  created_revision_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if jsonb_typeof(contribution_body) is distinct from 'object' then
    raise exception 'Contribution body must be an object'
      using errcode = '22023';
  end if;

  if char_length(contribution_edit_summary) > 500 then
    raise exception 'Edit summary is too long' using errcode = '22001';
  end if;

  select node.space_id
  into target_space_id
  from public.core_exam_content_nodes node
  where node.id = target_content_node_id
    and node.archived_at is null;

  if target_space_id is null
    or not public.core_exam_is_active_member(target_space_id)
  then
    raise exception 'Active space membership required'
      using errcode = '42501';
  end if;

  insert into public.core_exam_contributions (
    space_id,
    kind,
    target_node_id,
    author_id,
    visibility
  )
  values (
    target_space_id,
    contribution_kind,
    target_content_node_id,
    caller_id,
    contribution_visibility
  )
  returning id into created_contribution_id;

  insert into public.core_exam_contribution_revisions (
    contribution_id,
    revision_number,
    schema_version,
    body,
    plain_text,
    edit_summary,
    edited_by
  )
  values (
    created_contribution_id,
    1,
    'core-exam-v1',
    contribution_body,
    contribution_plain_text,
    nullif(btrim(contribution_edit_summary), ''),
    caller_id
  )
  returning id into created_revision_id;

  update public.core_exam_contributions
  set current_revision_id = created_revision_id
  where id = created_contribution_id;

  return created_contribution_id;
end;
$$;

create or replace function public.core_exam_save_contribution_revision(
  target_contribution_id uuid,
  base_revision_id uuid,
  contribution_visibility public.core_exam_visibility,
  contribution_body jsonb,
  contribution_plain_text text,
  contribution_edit_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  contribution_record public.core_exam_contributions%rowtype;
  created_revision_id uuid;
  next_revision_number integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if jsonb_typeof(contribution_body) is distinct from 'object' then
    raise exception 'Contribution body must be an object'
      using errcode = '22023';
  end if;

  if char_length(contribution_edit_summary) > 500 then
    raise exception 'Edit summary is too long' using errcode = '22001';
  end if;

  select contribution.*
  into contribution_record
  from public.core_exam_contributions contribution
  where contribution.id = target_contribution_id
  for update;

  if contribution_record.id is null
    or contribution_record.author_id <> caller_id
    or contribution_record.archived_at is not null
    or not public.core_exam_is_active_member(contribution_record.space_id)
  then
    raise exception 'Contribution author access required'
      using errcode = '42501';
  end if;

  if contribution_record.current_revision_id is distinct from base_revision_id
  then
    raise exception 'Contribution has a newer revision'
      using errcode = '40001';
  end if;

  select coalesce(max(revision.revision_number), 0) + 1
  into next_revision_number
  from public.core_exam_contribution_revisions revision
  where revision.contribution_id = target_contribution_id;

  insert into public.core_exam_contribution_revisions (
    contribution_id,
    revision_number,
    schema_version,
    body,
    plain_text,
    edit_summary,
    edited_by,
    based_on_revision_id
  )
  values (
    target_contribution_id,
    next_revision_number,
    'core-exam-v1',
    contribution_body,
    contribution_plain_text,
    nullif(btrim(contribution_edit_summary), ''),
    caller_id,
    base_revision_id
  )
  returning id into created_revision_id;

  update public.core_exam_contributions
  set
    current_revision_id = created_revision_id,
    visibility = contribution_visibility,
    updated_at = now()
  where id = target_contribution_id;

  return created_revision_id;
end;
$$;

revoke all on public.core_exam_verification_events from public;
revoke all on public.core_exam_contributions from public;
revoke all on public.core_exam_contribution_revisions from public;
grant select on public.core_exam_verification_events to authenticated;
grant select on public.core_exam_contributions to authenticated;
grant select on public.core_exam_contribution_revisions to authenticated;

revoke all on function public.core_exam_record_verification(
  uuid,
  public.core_exam_verification_state,
  text
) from public;
revoke all on function public.core_exam_create_contribution(
  uuid,
  public.core_exam_contribution_kind,
  public.core_exam_visibility,
  jsonb,
  text,
  text
) from public;
revoke all on function public.core_exam_save_contribution_revision(
  uuid,
  uuid,
  public.core_exam_visibility,
  jsonb,
  text,
  text
) from public;

grant execute on function public.core_exam_record_verification(
  uuid,
  public.core_exam_verification_state,
  text
) to authenticated;
grant execute on function public.core_exam_create_contribution(
  uuid,
  public.core_exam_contribution_kind,
  public.core_exam_visibility,
  jsonb,
  text,
  text
) to authenticated;
grant execute on function public.core_exam_save_contribution_revision(
  uuid,
  uuid,
  public.core_exam_visibility,
  jsonb,
  text,
  text
) to authenticated;

commit;
