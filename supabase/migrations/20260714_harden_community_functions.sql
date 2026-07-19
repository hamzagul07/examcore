-- Security hardening for community DB functions (Supabase advisors 0028/0029/0011).
--
-- 1. These 8 functions are trigger helpers (return trigger, zero-arg, each bound
--    to exactly one trigger). They carried the default EXECUTE-to-PUBLIC grant,
--    so they were callable by anon/authenticated via /rest/v1/rpc even though no
--    app code calls them. Triggers fire owner-side regardless of EXECUTE grants,
--    so revoking from PUBLIC closes the RPC surface with no behavioural change.
--    (Revoking from anon/authenticated by name is a no-op — they inherit PUBLIC.)
revoke execute on function public.community_answer_count_sync()   from public;
revoke execute on function public.community_answer_vote_sync()    from public;
revoke execute on function public.community_comment_apply_votes() from public;
revoke execute on function public.community_note_save_sync()      from public;
revoke execute on function public.community_note_vote_sync()      from public;
revoke execute on function public.community_post_apply_votes()    from public;
revoke execute on function public.community_post_comment_count()  from public;
revoke execute on function public.community_question_vote_sync()  from public;

-- 2. Pin search_path on the ranking helper so it can't be affected by a
--    role-mutable search_path. Behaviour unchanged — it already uses public.
alter function public.community_hot(integer, timestamptz) set search_path = public;
