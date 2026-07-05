-- Persist the guest Omni-chat rate limit.
--
-- The landing-page demo chat previously relied only on an in-memory
-- 40 messages/hour/IP bucket, which resets on every deploy and is not shared
-- across serverless instances. This adds a daily per-IP counter to the same
-- rate_limits bucket used for guest marks, so the cap survives restarts.
-- The in-memory hourly bucket stays as a cheap burst guard.

alter table public.rate_limits
  add column if not exists omni_count integer not null default 0;
