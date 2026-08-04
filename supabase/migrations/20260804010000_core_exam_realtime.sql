begin;

-- Enable Realtime (Postgres Changes) on the activity signal table. Every
-- collaborative action inserts a row here, so a single client subscription to
-- INSERTs lets everyone's view live-refresh. RLS still applies, so members only
-- receive their own space's events.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'core_exam_activity_events'
  ) then
    alter publication supabase_realtime
      add table public.core_exam_activity_events;
  end if;
end $$;

commit;
