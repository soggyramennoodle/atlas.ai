-- ---------------------------------------------------------------------------
-- Periodic cleanup for abandoned / stalled lecture-processing jobs.
--
-- Deletes incomplete jobs that have been idle longer than STALE_JOB_TTL_MS
-- (default 24h). Runs every 4 hours by default. Uses the same shared secret as
-- /api/jobs/tick.
--
-- HOW TO APPLY (one time):
--   1. Deploy the /api/jobs/cleanup route.
--   2. Ensure JOBS_TICK_SECRET (or CRON_SECRET) is set in Vercel.
--   3. Replace YOUR-APP.vercel.app and YOUR_SHARED_SECRET below, then run this
--      file in the Supabase SQL Editor.
--   4. Verify with:  select * from cron.job;
--
-- To change/remove later:  select cron.unschedule('atlas-lecture-cleanup');
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'atlas-lecture-cleanup',
  '0 */4 * * *',                                   -- every 4 hours
  $$
  select net.http_post(
    url     := 'https://atlasai.ca/api/jobs/cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-jobs-secret', 'YOUR_SHARED_SECRET' -- must equal JOBS_TICK_SECRET or CRON_SECRET
    ),
    body    := '{}'::jsonb
  );
  $$
);
