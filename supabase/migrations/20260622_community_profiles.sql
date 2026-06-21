-- Community foundation: public profile fields on user_profiles.
-- Adds a public @username identity (never expose email), avatar, bio, and a
-- reputation counter (Σ upvotes on a user's contributions).
--
-- Author identity for community content is read server-side via the service
-- role and embedded in API responses, so user_profiles RLS is unchanged here
-- (no public row exposure of private fields like board/subjects/exam_date).

create extension if not exists citext;

alter table public.user_profiles
  add column if not exists username citext unique,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists reputation integer not null default 0;

-- Username format: 3-20 chars, lowercase letters/digits/underscore (validated in
-- the app too). citext makes the unique constraint case-insensitive.
alter table public.user_profiles
  drop constraint if exists user_profiles_username_format;
alter table public.user_profiles
  add constraint user_profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');
