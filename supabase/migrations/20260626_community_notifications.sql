-- Exam Room notification preferences + digest tracking

alter table public.user_profiles
  add column if not exists email_community_replies boolean not null default true;

alter table public.user_profiles
  add column if not exists email_community_digest boolean not null default false;

alter table public.user_profiles
  add column if not exists community_digest_last_sent_at timestamptz;

comment on column public.user_profiles.email_community_replies is
  'Email when someone comments on your post or replies to your comment in Exam Room.';

comment on column public.user_profiles.email_community_digest is
  'Weekly email with trending Exam Room discussions in your subjects.';

-- Optional metadata on in-app notifications
alter table public.notifications
  add column if not exists body text;

create index if not exists idx_notifications_user_type_created
  on public.notifications (user_id, type, created_at desc);
