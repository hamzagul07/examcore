-- Pro hardening: contact performance, rate-limit column, RPC lockdown

-- Faster admin/support queries on contact inbox
create index if not exists idx_contact_messages_created_at
  on public.contact_messages (created_at desc);

create index if not exists idx_contact_messages_email
  on public.contact_messages (email);

-- Extend IP rate-limit rows for contact form abuse prevention
alter table public.rate_limits
  add column if not exists contact_count integer not null default 0;

-- Classroom ID helpers are for RLS policies only — not public RPC
revoke execute on function public.teacher_classroom_ids(uuid) from anon;
revoke execute on function public.teacher_student_ids(uuid) from anon;
revoke execute on function public.user_classroom_ids(uuid) from anon;

-- Explicit deny: contact messages are service-role inserts only
drop policy if exists "contact_messages_deny_select" on public.contact_messages;
create policy "contact_messages_deny_select"
  on public.contact_messages
  for select
  to authenticated, anon
  using (false);
