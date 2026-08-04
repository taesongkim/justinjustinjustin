begin;

-- Participation is a display/visibility axis, separate from the owner/member
-- permission role. 'active' students appear in progress displays (scoreboard,
-- per-card rings); 'observer' keeps full interaction but is hidden from them;
-- 'assistant' is the AI.
create type public.core_exam_participation as enum (
  'assistant',
  'active',
  'observer'
);

alter table public.core_exam_memberships
  add column participation public.core_exam_participation
    not null default 'active';

-- Initial backfill. The assistant is detected by its reserved identity; future
-- statuses are set at provisioning time.
update public.core_exam_memberships m
set participation = 'assistant'
where public.core_exam_is_assistant(m.user_id);

-- Andres is an observer for now.
update public.core_exam_memberships m
set participation = 'observer'
from auth.users u
where u.id = m.user_id
  and u.email = 'schabelman@gmail.com';

commit;
