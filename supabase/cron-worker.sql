-- ---------------------------------------------------------------------------
-- Minute-ly safety net for the durable lecture-processing worker.
--
-- The worker (/api/jobs/tick) self-chains while a job has work, so this cron
-- mostly restarts stalled chains and starts jobs whose Stop-time kick never
-- landed. A tick with no claimable work is a cheap no-op, so running every
-- minute is safe.
--
-- HOW TO APPLY (one time):
--   1. Set JOBS_TICK_SECRET in Vercel (Project → Settings → Environment
--      Variables) to the same value as in your .env.local, and redeploy.
--   2. In the Supabase SQL Editor, run the `create extension` lines below
--      (or enable pg_cron + pg_net via Database → Extensions).
--   3. Replace YOUR-APP.vercel.app with your deployed domain and
--      YOUR_SHARED_SECRET with your JOBS_TICK_SECRET (or CRON_SECRET), then run the
--      cron.schedule block.
--   4. Verify with:  select * from cron.job;
--
-- To change/remove later:  select cron.unschedule('atlas-lecture-worker');
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'atlas-lecture-worker',
  '* * * * *',                                   -- every minute
  $$
  select net.http_post(
    url     := 'https://atlasai.ca/api/jobs/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-jobs-secret', 'YOUR_SHARED_SECRET' -- must equal JOBS_TICK_SECRET or CRON_SECRET
    ),
    body    := '{}'::jsonb
  );
  $$
);
