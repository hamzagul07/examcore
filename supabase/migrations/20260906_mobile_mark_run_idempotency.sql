-- Client idempotency key for mark runs: a retried upload (connection lost
-- before the run id arrived) resolves to its original run instead of
-- starting and charging a second one.
-- Applied to production 2026-09-06 via MCP (mobile_mark_run_idempotency).
alter table public.mark_runs add column if not exists client_request_id text;
create unique index if not exists uq_mark_runs_client_request_id
  on public.mark_runs (client_request_id) where client_request_id is not null;
