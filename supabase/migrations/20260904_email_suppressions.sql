-- Stop mailing addresses that bounce or complain.
--
-- The campaign runner reports `sent: 280, failed: 0`, and that number means
-- Resend ACCEPTED 280 messages — not that 280 arrived. Hard bounces and spam
-- complaints happen minutes to hours after acceptance, over a webhook nobody
-- was listening to. So a dead address stays in every future audience, and a
-- student who marked us as spam gets mailed again, which is the single fastest
-- way to lose the sending domain that every activation email depends on.
--
-- Keyed on the address rather than the user id: a bounce is a property of the
-- mailbox, the webhook payload gives us an address and not a user, and an
-- address that hard-bounced should stay suppressed even if it is later attached
-- to a different account.
create table if not exists public.email_suppressions (
  email       text primary key,
  reason      text not null check (reason in ('bounced', 'complained')),
  detail      text,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

comment on table public.email_suppressions is
  'Addresses that hard-bounced or filed a spam complaint. Excluded from every campaign audience.';

create index if not exists idx_email_suppressions_reason
  on public.email_suppressions (reason, last_seen desc);

-- Service-role only, like every other table the client has no business reading.
-- RLS on with no policy: PostgREST can see nothing, the service key bypasses it.
alter table public.email_suppressions enable row level security;
revoke all on table public.email_suppressions from anon, authenticated;
revoke all on table public.email_suppressions from public;
