begin;

create or replace function public.core_exam_reject_content_revision_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Canonical content revisions are immutable'
    using errcode = '55000';
end;
$$;

revoke all
on function public.core_exam_reject_content_revision_mutation()
from public;

create trigger core_exam_content_revisions_immutable
before update or delete
on public.core_exam_content_revisions
for each row
execute function public.core_exam_reject_content_revision_mutation();

commit;
