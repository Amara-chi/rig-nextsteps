-- ============================================================
-- The Sunday 4pm follow-up message, on a schedule.
-- Run ONCE in the Supabase SQL editor of the hosted project, after
--   supabase functions deploy send-followups
-- has been done. Idempotent: re-running replaces the schedule.
--
-- 16:00 Lagos is 15:00 UTC all year (Nigeria has no daylight saving),
-- and pg_cron runs in UTC, so the cron expression is 0 15 * * 0.
--
-- The function only accepts the service role key as its bearer token
-- (the anon key is public, and this function messages newcomers), so
-- the key is kept in Vault rather than pasted into the schedule.
-- ============================================================
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 1) Put the service role key in Vault (Dashboard > Project Settings >
--    API > service_role). Replace the placeholder, run, then delete the
--    line from your editor history. Re-running with a new key updates it.
do $$
begin
  if exists (select 1 from vault.secrets where name = 'service_role_key') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'service_role_key'),
      'PASTE-SERVICE-ROLE-KEY-HERE');
  else
    perform vault.create_secret('PASTE-SERVICE-ROLE-KEY-HERE', 'service_role_key');
  end if;
end $$;

-- 2) The schedule itself. Replace PROJECT-REF with the project's ref
--    (the part before .supabase.co in the project URL).
select cron.unschedule(jobid) from cron.job where jobname = 'sunday-followups';
select cron.schedule(
  'sunday-followups',
  '0 15 * * 0',
  $$
  select net.http_post(
    url := 'https://PROJECT-REF.supabase.co/functions/v1/send-followups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To see it: select jobname, schedule, active from cron.job;
-- To see runs: select * from cron.job_run_details order by start_time desc limit 10;
-- To stop it: select cron.unschedule('sunday-followups');
