-- Security: reserve_mark_usage is SECURITY DEFINER (bypasses RLS) and takes a
-- p_user_id parameter, but was left executable by anon/authenticated via
-- PostgREST rpc — letting any user insert usage rows for arbitrary users. The app
-- only ever calls it with the service-role client, so lock it down to match the
-- other billing RPCs (consume_credit / apply_credit_topup / apply_credit_refund).
revoke all on function public.reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer) from public;
revoke all on function public.reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer) from anon, authenticated;
grant execute on function public.reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer) to service_role;
