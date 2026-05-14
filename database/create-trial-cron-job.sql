-- SQL: Create daily cron job for trial expiry notifications
-- Execute this in Supabase SQL Editor to enable daily email notifications
-- This will run every day at 9:00 AM (UTC) to check and notify users about trial expiry

SELECT cron.schedule(
  'trial-expiry-notification',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kcrwbjhtofyoojjamoaz.supabase.co/functions/v1/send-notifications',
    body := '{"type": "trial_expiry"}'::jsonb
  )
  $$
);

-- Verify the cron job has been created:
-- SELECT * FROM cron.job WHERE jobname = 'trial-expiry-notification';

-- To delete the cron job (if needed):
-- SELECT cron.unschedule('trial-expiry-notification');
