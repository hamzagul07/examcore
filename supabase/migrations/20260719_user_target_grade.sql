-- Target grade: the grade a student is aiming for (Cambridge letter or IB 1–7).
-- Powers the "on track for X · target Y · +N% to go" trajectory. Nullable text;
-- validated in the app against the user's board.

alter table public.user_profiles
  add column if not exists target_grade text;
