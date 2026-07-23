-- D1: XP / accepted-answer reputation farm.
-- awardXp inserted an xp_events row unconditionally and community_accept_answer
-- always returned true for the question author, so a user could create a
-- question, answer it themselves, and POST accept N times to farm +15 XP and
-- +15 subject reputation each call. Two fixes:

-- (1) Make xp_events idempotent per (user, kind, ref). NULLs are distinct, so
-- generic ref-less awards are unaffected; (author,'accepted_answer',answerId)
-- and (user,'paper_marked',attemptId) can each be recorded at most once.
create unique index if not exists xp_events_user_kind_ref_uniq
  on public.xp_events (user_id, kind, ref_id);

-- (2) Make accept idempotent and validated: return true (which triggers the XP
-- award) ONLY when a not-already-accepted answer that actually belongs to the
-- question is newly accepted. Re-accepting, or passing an answer id from another
-- question, now returns false and awards nothing.
create or replace function public.community_accept_answer(
  p_question_id uuid, p_answer_id uuid, p_user_id uuid
) returns boolean
  language plpgsql security definer set search_path to 'public'
as $$
declare
  v_author uuid;
  v_current uuid;
  v_matched int;
begin
  select author_id, accepted_answer_id into v_author, v_current
    from community_questions where id = p_question_id;
  if v_author is null or v_author <> p_user_id then
    return false;
  end if;
  -- Already the accepted answer: no-op so the caller does not re-award XP.
  if v_current is not distinct from p_answer_id then
    return false;
  end if;
  -- The answer must belong to this question, else there is nothing to accept.
  update community_answers set is_accepted = true
    where id = p_answer_id and question_id = p_question_id;
  get diagnostics v_matched = row_count;
  if v_matched = 0 then
    return false;
  end if;
  update community_answers set is_accepted = false
    where question_id = p_question_id and id <> p_answer_id;
  update community_questions set accepted_answer_id = p_answer_id
    where id = p_question_id;
  return true;
end $$;

-- D3: self-voting granted the author global reputation. The vote-sync triggers
-- bumped user_profiles.reputation unconditionally; a user upvoting their own
-- content gained +1 rep per item. Skip the reputation change when the voter IS
-- the author (vote_count still counts, Reddit-style). Mirrors the routes, which
-- already gate the *subject* reputation bump on author <> voter.
create or replace function public.community_answer_vote_sync()
  returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_answers set vote_count = vote_count + 1 where id = new.answer_id;
    update public.user_profiles set reputation = reputation + 1
      where id = (select author_id from public.community_answers where id = new.answer_id)
        and id <> new.user_id;
  elsif tg_op = 'DELETE' then
    update public.community_answers set vote_count = greatest(0, vote_count - 1) where id = old.answer_id;
    update public.user_profiles set reputation = greatest(0, reputation - 1)
      where id = (select author_id from public.community_answers where id = old.answer_id)
        and id <> old.user_id;
  end if;
  return null;
end $$;

create or replace function public.community_question_vote_sync()
  returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_questions set vote_count = vote_count + 1 where id = new.question_id;
    update public.user_profiles set reputation = reputation + 1
      where id = (select author_id from public.community_questions where id = new.question_id)
        and id <> new.user_id;
  elsif tg_op = 'DELETE' then
    update public.community_questions set vote_count = greatest(0, vote_count - 1) where id = old.question_id;
    update public.user_profiles set reputation = greatest(0, reputation - 1)
      where id = (select author_id from public.community_questions where id = old.question_id)
        and id <> old.user_id;
  end if;
  return null;
end $$;

create or replace function public.community_note_vote_sync()
  returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_notes set upvote_count = upvote_count + 1 where id = new.note_id;
    update public.user_profiles set reputation = reputation + 1
      where id = (select author_id from public.community_notes where id = new.note_id)
        and id <> new.user_id;
  elsif tg_op = 'DELETE' then
    update public.community_notes set upvote_count = greatest(0, upvote_count - 1) where id = old.note_id;
    update public.user_profiles set reputation = greatest(0, reputation - 1)
      where id = (select author_id from public.community_notes where id = old.note_id)
        and id <> old.user_id;
  end if;
  return null;
end $$;
