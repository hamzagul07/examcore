-- Security: these SECURITY DEFINER community functions take user-controllable
-- ids and were executable by anon/authenticated via PostgREST rpc, allowing
-- reputation inflation / accepting answers on questions you don't own / forcing
-- auto-flags. The app invokes them only with the service-role (admin) client, so
-- revoke public execute and grant the service role. Caught by the security advisor.
revoke all on function public.bump_subject_reputation(uuid, text, integer) from public;
revoke all on function public.bump_subject_reputation(uuid, text, integer) from anon, authenticated;
grant execute on function public.bump_subject_reputation(uuid, text, integer) to service_role;

revoke all on function public.community_accept_answer(uuid, uuid, uuid) from public;
revoke all on function public.community_accept_answer(uuid, uuid, uuid) from anon, authenticated;
grant execute on function public.community_accept_answer(uuid, uuid, uuid) to service_role;

revoke all on function public.community_auto_flag_target(text, uuid, integer) from public;
revoke all on function public.community_auto_flag_target(text, uuid, integer) from anon, authenticated;
grant execute on function public.community_auto_flag_target(text, uuid, integer) to service_role;
