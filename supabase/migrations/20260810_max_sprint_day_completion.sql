-- Max Vault sprint/week pack day checklist (user-owned, client-writable).
create table if not exists public.max_sprint_day_completion (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_code text not null,
  week_label text not null,
  day_number smallint not null check (day_number between 1 and 14),
  completed_at timestamptz not null default now(),
  primary key (user_id, subject_code, week_label, day_number)
);

create index if not exists idx_max_sprint_day_completion_user
  on public.max_sprint_day_completion (user_id, subject_code, week_label);

alter table public.max_sprint_day_completion enable row level security;

drop policy if exists "Users manage own sprint day completion" on public.max_sprint_day_completion;
create policy "Users manage own sprint day completion"
  on public.max_sprint_day_completion for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.max_sprint_day_completion from public;
grant select, insert, update, delete on table public.max_sprint_day_completion to authenticated;
grant all on table public.max_sprint_day_completion to service_role;
