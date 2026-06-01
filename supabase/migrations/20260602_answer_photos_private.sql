-- Pass 16: private answer-photos bucket + path normalization + RPC lockdown

-- Store paths in DB, not public URLs
update public.attempts
set answer_photo_url = regexp_replace(
  answer_photo_url,
  '^https://[^/]+/storage/v1/object/public/answer-photos/',
  ''
)
where answer_photo_url like '%/storage/v1/object/public/answer-photos/%';

-- Private bucket — clients read via signed URLs (service role)
update storage.buckets
set public = false
where id = 'answer-photos';

drop policy if exists "answer-photos: public read" on storage.objects;

-- Classroom ID helpers are for RLS only, not client RPC
revoke execute on function public.teacher_classroom_ids(uuid) from authenticated;
revoke execute on function public.teacher_student_ids(uuid) from authenticated;
revoke execute on function public.user_classroom_ids(uuid) from authenticated;

grant execute on function public.teacher_classroom_ids(uuid) to service_role;
grant execute on function public.teacher_student_ids(uuid) to service_role;
grant execute on function public.user_classroom_ids(uuid) to service_role;
