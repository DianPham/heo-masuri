-- Phase 2 — restore service_role grants on all new Phase 2 tables.
--
-- The staging Supabase project auto-granted DML to all roles for new tables
-- (older project default). The prod project requires explicit grants. Without
-- this, every Phase 2 write via the service-role key returns
--   42501 "permission denied for table <name>"
-- and the Vercel routes silently swallow it (e.g. cron_heartbeats.upsert
-- inside the dispatcher).
--
-- Idempotent — re-running on staging or any other environment is a no-op.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'cron_heartbeats',
      'calendar_events',
      'recurring_schedule_template',
      'important_dates',
      'date_ideas',
      'wardrobe_items',
      'outfit_suggestions',
      'date_outline_templates',
      'scheduled_dates',
      'surprise_pool',
      'surprise_deliveries',
      'recurring_letters'
    ])
  loop
    execute format(
      'grant select, insert, update, delete on public.%I to anon, authenticated, service_role',
      t
    );
  end loop;
end$$;

-- Also re-grant on sequences for any of the above that use SERIAL/IDENTITY.
-- Loop covers both old SERIAL sequences and IDENTITY-managed ones.
do $$
declare
  s text;
begin
  for s in
    select sequencename
    from pg_sequences
    where schemaname = 'public'
      and sequencename in (
        select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'S'
      )
  loop
    execute format(
      'grant usage, select on sequence public.%I to anon, authenticated, service_role',
      s
    );
  end loop;
end$$;
