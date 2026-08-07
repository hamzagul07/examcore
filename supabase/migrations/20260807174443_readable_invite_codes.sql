-- Readable classroom invite codes.
--
-- The default was `substring(md5(random()::text) for 8)` — lowercase hex, which
-- a teacher has to dictate to a room of thirty. Codes are now drawn from an
-- alphabet with no O/0 and no I/1/L, and stored uppercase so the application can
-- match them with a plain equality test.
--
-- That last part is the security half of this change: both lookup routes used
-- `ILIKE` against an unsanitised path segment, so `/join/%` was a wildcard that
-- matched every classroom. Equality on a normalised, charset-validated code
-- removes the pattern match entirely (see lib/teacher/invite-code.ts).

create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  i integer;
begin
  for i in 1..6 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end;
$$;

-- Existing codes are lowercase hex. Uppercase them in place so every stored code
-- is in the same form the application normalises to; the codes stay valid and
-- any invite link already handed out keeps working, since lookup is
-- case-normalised before it reaches the query.
update public.classrooms
   set invite_code = upper(invite_code)
 where invite_code is not null
   and invite_code <> upper(invite_code);

alter table public.classrooms
  alter column invite_code set default public.generate_invite_code();

-- Backfill any classroom that somehow has no code, and make the column
-- mandatory: a classroom nobody can join is not a classroom.
update public.classrooms
   set invite_code = public.generate_invite_code()
 where invite_code is null;

alter table public.classrooms
  alter column invite_code set not null;

-- Guard the shape at the database edge too, so a bad code cannot be written by
-- any path — including a future script that bypasses the application.
alter table public.classrooms
  drop constraint if exists classrooms_invite_code_shape;
alter table public.classrooms
  add constraint classrooms_invite_code_shape
  check (invite_code ~ '^[A-Z0-9]{4,12}$');
