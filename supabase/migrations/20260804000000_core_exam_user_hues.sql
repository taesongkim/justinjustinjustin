-- Auto-assign a distinct, muted user hue when a profile is created.
--
-- Palette: 20 colors derived in OKLCH at a fixed lightness (0.73) and chroma
-- (0.108) so every hue sits at the same muted tone, ordered so the first six
-- are maximally distinct. Assigned round-robin by profile join order. A profile
-- keeps whatever color it has on UPDATE, so a future "change my hue" flow just
-- writes a new value.

create or replace function public.core_exam_hue_palette()
returns text[]
language sql
immutable
as $$
  select array[
    '#e48c85', '#74bb83', '#94a2ec', '#c7a252', '#41bacd', '#ce8fc8',
    '#dc9563', '#45beb0', '#b796de', '#a5b05d', '#6aafe7', '#dd8bab',
    '#e29073', '#91b56b', '#3ebcc2', '#7fa8ec', '#d39b58', '#5ebd97',
    '#a79ce7', '#e38b92'
  ];
$$;

-- The assistant reads as a neutral "system" voice, not one of the members, so
-- it gets a fixed near-ink neutral and never consumes a palette slot. (Dark
-- mode will flip this toward near-white in the UI.)
create or replace function public.core_exam_is_assistant(target uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    (select au.email = 'ai-assistant@core-exam.invalid'
     from auth.users au where au.id = target),
    false
  );
$$;

create or replace function public.core_exam_assign_avatar_color()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  palette text[] := public.core_exam_hue_palette();
  ordinal integer;
begin
  if public.core_exam_is_assistant(new.user_id) then
    new.avatar_color := '#333b36';
    return new;
  end if;
  -- Count existing human members (assistant excluded) so the Nth member gets
  -- the Nth palette hue. The new row isn't inserted yet in BEFORE INSERT.
  select count(*) into ordinal
  from public.core_exam_profiles p
  where not public.core_exam_is_assistant(p.user_id);
  new.avatar_color := palette[(ordinal % array_length(palette, 1)) + 1];
  return new;
end;
$$;

drop trigger if exists core_exam_profiles_assign_color
  on public.core_exam_profiles;
create trigger core_exam_profiles_assign_color
before insert on public.core_exam_profiles
for each row execute function public.core_exam_assign_avatar_color();

-- Backfill: assistant → neutral; members → palette by human join order.
update public.core_exam_profiles p
set avatar_color = '#333b36'
where public.core_exam_is_assistant(p.user_id);

with palette as (select public.core_exam_hue_palette() as p),
ordered as (
  select
    user_id,
    (row_number() over (order by created_at, user_id) - 1) as rn
  from public.core_exam_profiles
  where not public.core_exam_is_assistant(user_id)
)
update public.core_exam_profiles pr
set avatar_color = palette.p[(o.rn % array_length(palette.p, 1)) + 1]
from ordered o, palette
where pr.user_id = o.user_id;
