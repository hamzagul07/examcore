-- Cache personalised Max exam packs per user / subject / ISO week.
-- Written by service role from the Vault; students may read their own rows.

create table if not exists public.max_exam_pack_cache (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_code text not null,
  week_label text not null,
  is_sprint boolean not null default false,
  pack jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_code, week_label)
);

create index if not exists idx_max_exam_pack_cache_user_updated
  on public.max_exam_pack_cache (user_id, updated_at desc);

alter table public.max_exam_pack_cache enable row level security;

drop policy if exists "Users can view own max exam packs" on public.max_exam_pack_cache;
create policy "Users can view own max exam packs"
  on public.max_exam_pack_cache for select
  using (auth.uid() = user_id);

-- Writes go through the service role (Vault assembler). No insert/update for authenticated.
revoke all on table public.max_exam_pack_cache from public;
grant select on table public.max_exam_pack_cache to authenticated;
grant all on table public.max_exam_pack_cache to service_role;
