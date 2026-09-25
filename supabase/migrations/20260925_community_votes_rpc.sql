-- Atomic post / comment voting with the reputation delta in the same transaction.
--
-- The vote routes used to do three separate calls from JavaScript: read the
-- voter's previous vote, upsert or delete it, then bump_subject_reputation
-- by (isUp - wasUp) * 2. Nothing serialised them. Two concurrent upvotes from
-- one user both read "no previous vote", both wrote value = 1 (the composite
-- PK made the second an idempotent upsert), and both credited the author
-- +2 — so a double-click was +4, and toggling off afterwards was only -2.
-- Reputation drifted up by 2 per race and never came back (code review
-- 2026-09-25, §2 Community — vote-reputation race).
--
-- vote_post / vote_comment do the whole thing in one plpgsql transaction,
-- under a per-(target, voter) advisory lock so the previous-value read and
-- the write cannot interleave with a second request from the same voter.
--
-- These run as auth.uid(): a signed-in caller can only ever vote as
-- themselves, which is why they are (a) in the audit's rpc_allowlist below
-- and granted to `authenticated`, unlike bump_subject_reputation which takes
-- an arbitrary user id and stays service-role only. The web routes call them
-- through the user's own session client; the mobile app can call them
-- directly.
--
-- Idempotent: CREATE OR REPLACE throughout.

-- ---------------------------------------------------------------------------
-- vote_post
-- ---------------------------------------------------------------------------
-- Output column names are deliberately NOT the table's own (value, score,
-- author_id): inside `returns table` they become variables that shadow the
-- columns the body reads, and plpgsql then refuses the query as ambiguous.
CREATE OR REPLACE FUNCTION public.vote_post(p_post uuid, p_value integer)
RETURNS TABLE (
  new_value integer,
  post_score integer,
  post_author uuid,
  post_subject text,
  was_upvote boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prev integer;
  v_next integer;
  v_author uuid;
  v_subject text;
  v_score integer;
  -- Mirrors UPVOTE_REP in lib/community/vote-rep.ts. Change both together.
  v_rep CONSTANT integer := 2;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'vote_post: sign in to vote' USING ERRCODE = '42501';
  END IF;
  IF p_value IS NULL OR p_value NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'vote_post: value must be 1 or -1' USING ERRCODE = '22023';
  END IF;

  SELECT p.author_id, p.subject_code INTO v_author, v_subject
    FROM public.community_posts p
   WHERE p.id = p_post;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'vote_post: post not found' USING ERRCODE = 'P0002';
  END IF;

  -- Serialise this voter's votes on this post for the rest of the
  -- transaction. Different voters (or the same voter on other posts) take
  -- different keys and do not wait on each other.
  PERFORM pg_advisory_xact_lock(hashtext('vote_post'), hashtext(p_post::text || ':' || v_user::text));

  SELECT v.value INTO v_prev
    FROM public.community_post_votes v
   WHERE v.post_id = p_post AND v.user_id = v_user;

  IF v_prev = p_value THEN
    -- Same button again: toggle off.
    DELETE FROM public.community_post_votes
     WHERE post_id = p_post AND user_id = v_user;
    v_next := 0;
  ELSE
    INSERT INTO public.community_post_votes (post_id, user_id, value)
    VALUES (p_post, v_user, p_value)
    ON CONFLICT (post_id, user_id) DO UPDATE SET value = EXCLUDED.value;
    v_next := p_value;
  END IF;

  -- Reputation only moves for OTHER people's upvotes: +rep when the vote
  -- becomes an upvote, -rep when an upvote is toggled off or flipped down.
  -- bump_subject_reputation floors at 0 and ignores a zero delta.
  IF v_author IS DISTINCT FROM v_user AND v_subject IS NOT NULL THEN
    PERFORM public.bump_subject_reputation(
      v_author,
      v_subject,
      (CASE WHEN v_next = 1 THEN v_rep ELSE 0 END) - (CASE WHEN v_prev = 1 THEN v_rep ELSE 0 END)
    );
  END IF;

  -- trg_community_post_votes has already recomputed the counters.
  SELECT p.score INTO v_score FROM public.community_posts p WHERE p.id = p_post;

  RETURN QUERY SELECT v_next, coalesce(v_score, 0), v_author, v_subject, coalesce(v_prev = 1, false);
END;
$$;

REVOKE ALL ON FUNCTION public.vote_post(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vote_post(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.vote_post(uuid, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.vote_post(uuid, integer) IS
  'Toggle/set the calling user''s vote (1 or -1) on a post and apply the author''s reputation delta in the same transaction. Returns the new vote value, the post score, author, subject, and whether the previous vote was an upvote.';

-- ---------------------------------------------------------------------------
-- vote_comment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vote_comment(p_comment uuid, p_value integer)
RETURNS TABLE (
  new_value integer,
  comment_score integer,
  comment_author uuid,
  parent_post uuid,
  post_subject text,
  was_upvote boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prev integer;
  v_next integer;
  v_author uuid;
  v_post uuid;
  v_subject text;
  v_score integer;
  v_rep CONSTANT integer := 2;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'vote_comment: sign in to vote' USING ERRCODE = '42501';
  END IF;
  IF p_value IS NULL OR p_value NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'vote_comment: value must be 1 or -1' USING ERRCODE = '22023';
  END IF;

  -- Comments carry no subject of their own; it comes from the parent post.
  SELECT c.author_id, c.post_id, p.subject_code INTO v_author, v_post, v_subject
    FROM public.community_comments c
    LEFT JOIN public.community_posts p ON p.id = c.post_id
   WHERE c.id = p_comment;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'vote_comment: comment not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('vote_comment'), hashtext(p_comment::text || ':' || v_user::text));

  SELECT v.value INTO v_prev
    FROM public.community_comment_votes v
   WHERE v.comment_id = p_comment AND v.user_id = v_user;

  IF v_prev = p_value THEN
    DELETE FROM public.community_comment_votes
     WHERE comment_id = p_comment AND user_id = v_user;
    v_next := 0;
  ELSE
    INSERT INTO public.community_comment_votes (comment_id, user_id, value)
    VALUES (p_comment, v_user, p_value)
    ON CONFLICT (comment_id, user_id) DO UPDATE SET value = EXCLUDED.value;
    v_next := p_value;
  END IF;

  IF v_author IS DISTINCT FROM v_user AND v_subject IS NOT NULL THEN
    PERFORM public.bump_subject_reputation(
      v_author,
      v_subject,
      (CASE WHEN v_next = 1 THEN v_rep ELSE 0 END) - (CASE WHEN v_prev = 1 THEN v_rep ELSE 0 END)
    );
  END IF;

  SELECT c.score INTO v_score FROM public.community_comments c WHERE c.id = p_comment;

  RETURN QUERY SELECT v_next, coalesce(v_score, 0), v_author, v_post, v_subject, coalesce(v_prev = 1, false);
END;
$$;

REVOKE ALL ON FUNCTION public.vote_comment(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vote_comment(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.vote_comment(uuid, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.vote_comment(uuid, integer) IS
  'Toggle/set the calling user''s vote (1 or -1) on a comment and apply the author''s reputation delta in the same transaction. Returns the new vote value, the comment score, author, parent post, subject, and whether the previous vote was an upvote.';

-- ---------------------------------------------------------------------------
-- Grants audit: both functions are (a) ownership-checked, signed-in only —
-- they act as auth.uid() and refuse a null one. Same body as production's
-- current definition (which carries the creators entries this repo's
-- 20260917_roadmap_v3.sql predates) with the two names added to rpc_allowlist.
-- ---------------------------------------------------------------------------
create or replace function public.audit_client_grants()
returns table(severity text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  client_roles constant text[] := array['anon', 'authenticated'];
  protected constant text[][] := array[
    array['user_profiles', 'role',                    'gates the whole /teacher surface'],
    array['user_profiles', 'teacher_verified_at',     'grants the free teacher allowance'],
    array['user_profiles', 'teacher_verified_reason', 'the audit trail for that grant'],
    array['user_profiles', 'reputation',              'community standing'],
    -- Present in production (creators feature, applied from its own branch):
    -- a redefinition that omitted them would silently stop auditing them.
    array['user_profiles', 'referred_by',             'creator attribution, written once by the service role'],
    array['user_profiles', 'referred_at',             'when that attribution was written']
  ];
  service_only constant text[] := array[
    'visit_sessions',
    'outreach_targets',
    'teacher_seat_requests',
    'study_plans',
    'study_plan_events',
    -- creators feature (production): service-role only.
    'creators',
    'creator_code_claims',
    'creator_conversions',
    'creator_tip_tests',
    'creator_applications'
  ];
  -- Each entry is either (a) a function that MUST be callable by a signed-in
  -- user and that enforces its own auth.uid() ownership check, or (b) an
  -- aggregate read over public data whose caller-specific fields are empty
  -- for anon. Adding a name here is a security decision: read the body
  -- first, and say which of the two it is.
  rpc_allowlist constant text[] := array[
    -- (a) ownership-checked, signed-in only
    'teacher_student_ids',
    'user_classroom_ids',
    'teacher_classroom_ids',
    'dm_open_thread',
    'dm_inbox',
    'dm_mark_read',
    'dm_is_blocked',
    'create_poll',
    'vote_poll',
    'set_user_flair',
    -- (a) votes as auth.uid() only (20260925_community_votes_rpc.sql)
    'vote_post',
    'vote_comment',
    -- (b) aggregate public reads (20260916_community_rpc_allowlist.sql)
    'get_poll',
    'get_reactions',
    'get_follow_stats'
  ];
  i integer;
begin
  -- A table-wide INSERT/UPDATE makes every column restriction on that table
  -- unenforceable, however the role came by it.
  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'table-grant'::text,
             format(
               '%s: %s holds a table-wide %s grant (possibly via PUBLIC), which makes every column restriction on this table unenforceable',
               protected[i][1], r.rolname, p.priv
             )
        from unnest(client_roles) as r(rolname)
       cross join unnest(array['INSERT', 'UPDATE']) as p(priv)
       where to_regclass('public.' || protected[i][1]) is not null
         and has_table_privilege(r.rolname, 'public.' || protected[i][1], p.priv);
  end loop;

  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'column'::text,
             format('%s.%s: %s can %s it (possibly via PUBLIC) — %s',
                    protected[i][1], protected[i][2], r.rolname, p.priv, protected[i][3])
        from unnest(client_roles) as r(rolname)
       cross join unnest(array['INSERT', 'UPDATE']) as p(priv)
       where to_regclass('public.' || protected[i][1]) is not null
         and exists (
           select 1 from information_schema.columns c
            where c.table_schema = 'public'
              and c.table_name = protected[i][1]
              and c.column_name = protected[i][2]
         )
         and has_column_privilege(
               r.rolname, 'public.' || protected[i][1], protected[i][2], p.priv
             );
  end loop;

  -- Service-role-only tables: any client reachability at all is a violation.
  return query
    select 'service-only-table'::text,
           format('%s: %s holds %s on a service-role-only table (possibly via PUBLIC)',
                  t.name, r.rolname, p.priv)
      from unnest(service_only) as t(name)
     cross join unnest(client_roles) as r(rolname)
     cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p(priv)
     where to_regclass('public.' || t.name) is not null
       and has_table_privilege(r.rolname, 'public.' || t.name, p.priv);

  return query
    select 'security-definer-rpc'::text,
           format(
             '%s(%s): %s can execute this SECURITY DEFINER function — it runs as the owner and bypasses RLS. Revoke FROM PUBLIC (revoking from the role alone is a no-op), or add it to rpc_allowlist.',
             p.proname, pg_get_function_identity_arguments(p.oid), r.rolname
           )
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     cross join unnest(client_roles) as r(rolname)
     where n.nspname = 'public'
       and p.prosecdef
       and not (p.proname = any(rpc_allowlist))
       and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
end;
$$;
