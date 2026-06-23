-- Optional email when there's new activity anywhere on your post's thread

alter table public.user_profiles
  add column if not exists email_community_threads boolean not null default false;

comment on column public.user_profiles.email_community_threads is
  'Email when someone replies anywhere in a thread on your post (not just direct replies).';
