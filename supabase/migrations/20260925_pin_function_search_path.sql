-- Pin search_path on the four functions the Supabase security advisor flags as
-- "role mutable search_path" (lint 0011).
--
-- All four are SECURITY INVOKER and use only built-ins (random, floor, substr,
-- lower, now, LIKE, ~) plus schema-qualified public.* references, so pinning
-- to `public` changes no resolution — it only removes the ability of a caller
-- with a crafted search_path to shadow a built-in inside them. pg_catalog is
-- always searched first regardless.
--
-- Idempotent: ALTER FUNCTION ... SET is safe to re-run.

ALTER FUNCTION public.is_school_host(text) SET search_path = public;
ALTER FUNCTION public.classify_channel(text, text, text) SET search_path = public;
ALTER FUNCTION public.generate_invite_code() SET search_path = public;
ALTER FUNCTION public.touch_outreach_target() SET search_path = public;
