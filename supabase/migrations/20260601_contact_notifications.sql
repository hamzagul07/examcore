-- Contact form submissions + notification preferences on profiles

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Inserts via service role only (API route)
create policy "contact_messages_service_insert"
  on public.contact_messages
  for insert
  to service_role
  with check (true);

alter table public.user_profiles
  add column if not exists email_exam_reminders boolean not null default false;

alter table public.user_profiles
  add column if not exists email_product_updates boolean not null default false;

comment on column public.user_profiles.email_exam_reminders is
  'Opt-in: exam countdown and study reminder emails';

comment on column public.user_profiles.email_product_updates is
  'Opt-in: product updates and usage limit notices';
