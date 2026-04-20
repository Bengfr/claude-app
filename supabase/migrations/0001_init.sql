-- =====================================================================
-- Tracker schema: profiles, food_log, exercises, workout sessions/logs,
-- feed_event ledger + triggers. RLS on everywhere.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------- profile ----------
create table public.profile (
  id                uuid primary key references auth.users(id) on delete cascade,
  name              text not null,
  age               int,
  weight_kg         numeric,
  height_cm         numeric,
  target_calories   int  not null,
  target_protein_g  int  not null,
  target_carbs_g    int  not null,
  target_fat_g      int  not null,
  created_at        timestamptz not null default now()
);

-- ---------- food_log ----------
create table public.food_log (
  id         bigserial primary key,
  user_id    uuid not null references public.profile(id) on delete cascade,
  logged_at  timestamptz not null default now(),
  item_name  text,
  calories   numeric not null,
  protein_g  numeric not null,
  carbs_g    numeric not null,
  fat_g      numeric not null,
  barcode    text,
  meal_type  text not null default 'snack'
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'))
);
create index food_log_user_logged_idx     on public.food_log (user_id, logged_at desc);
create index food_log_user_meal_logged_idx on public.food_log (user_id, meal_type, logged_at desc);

-- ---------- exercise ----------
-- owner_id NULL = hardcoded standard lift; non-null = user's custom lift.
-- Use coalesce sentinel so the unique index treats hardcoded names globally
-- and per-user customs scoped to that user.
create table public.exercise (
  id        bigserial primary key,
  name      text not null,
  is_custom boolean not null default false,
  owner_id  uuid references public.profile(id) on delete cascade
);
create unique index exercise_owner_lower_name_idx
  on public.exercise (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- ---------- workout_session ----------
create table public.workout_session (
  id         bigserial primary key,
  user_id    uuid not null references public.profile(id) on delete cascade,
  started_at timestamptz not null default now(),
  name       text
);
create index workout_session_user_started_idx on public.workout_session (user_id, started_at desc);

-- ---------- workout_log ----------
create table public.workout_log (
  id          bigserial primary key,
  session_id  bigint not null references public.workout_session(id) on delete cascade,
  user_id     uuid   not null references public.profile(id) on delete cascade,
  exercise_id bigint not null references public.exercise(id),
  set_number  int    not null,
  reps        int    not null,
  weight_kg   numeric not null,
  logged_at   timestamptz not null default now()
);
create index workout_log_user_exercise_logged_idx
  on public.workout_log (user_id, exercise_id, logged_at desc);

-- ---------- daily_goal_hit (idempotency ledger) ----------
create table public.daily_goal_hit (
  user_id    uuid not null references public.profile(id) on delete cascade,
  date       date not null,
  goal_type  text not null,
  primary key (user_id, date, goal_type)
);

-- ---------- feed_event ----------
create table public.feed_event (
  id         bigserial primary key,
  user_id    uuid not null references public.profile(id),
  session_id bigint references public.workout_session(id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now()
);
create index feed_event_created_idx on public.feed_event (created_at desc);

-- =====================================================================
-- Triggers: feed events
-- =====================================================================

-- 1. New workout session -> "<name> logged a workout[: Leg Day]"
-- DECLARE-free style: a single INSERT...SELECT joins profile inline.
create or replace function public.fn_workout_session_feed()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.feed_event (user_id, session_id, message)
  select
    new.user_id,
    new.id,
    coalesce(p.name, 'Someone') || ' logged a workout' ||
      case when new.name is not null and length(trim(new.name)) > 0
           then ': ' || new.name else '' end
  from public.profile p
  where p.id = new.user_id;
  return new;
end;
$func$;

create trigger trg_workout_session_feed
  after insert on public.workout_session
  for each row execute function public.fn_workout_session_feed();

-- 2. New food_log -> if today's calorie sum crossed target, post once.
-- DECLARE-free: ledger insert is gated by an inline aggregate; FOUND tells us
-- whether the row actually wrote (i.e. first cross today, not a conflict).
create or replace function public.fn_food_log_calorie_goal()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.daily_goal_hit (user_id, date, goal_type)
  select
    new.user_id,
    (new.logged_at at time zone 'UTC')::date,
    'calories'
  from public.profile p
  where p.id = new.user_id
    and p.target_calories is not null
    and (
      select coalesce(sum(f.calories), 0)
      from public.food_log f
      where f.user_id = new.user_id
        and (f.logged_at at time zone 'UTC')::date = (new.logged_at at time zone 'UTC')::date
    ) >= p.target_calories
  on conflict do nothing;

  if found then
    insert into public.feed_event (user_id, message)
    select
      new.user_id,
      coalesce(p.name, 'Someone') || ' hit their daily calorie goal'
    from public.profile p
    where p.id = new.user_id;
  end if;

  return new;
end;
$func$;

create trigger trg_food_log_calorie_goal
  after insert on public.food_log
  for each row execute function public.fn_food_log_calorie_goal();

-- =====================================================================
-- Role privileges (must come before RLS — RLS only filters rows you can
-- already touch; without GRANTs every request hits "permission denied").
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables    in schema public to authenticated;
grant select                          on all tables    in schema public to anon;
grant usage, select                   on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables    to authenticated;
alter default privileges in schema public
  grant select                          on tables    to anon;
alter default privileges in schema public
  grant usage, select                   on sequences to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================

alter table public.profile         enable row level security;
alter table public.food_log        enable row level security;
alter table public.exercise        enable row level security;
alter table public.workout_session enable row level security;
alter table public.workout_log     enable row level security;
alter table public.feed_event      enable row level security;
alter table public.daily_goal_hit  enable row level security;

-- profile: anyone authenticated can read; only owner can insert/update self.
create policy profile_select on public.profile for select to authenticated using (true);
create policy profile_insert on public.profile for insert to authenticated with check (id = auth.uid());
create policy profile_update on public.profile for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- food_log / workout_session / workout_log: owner only.
create policy food_log_owner on public.food_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy workout_session_owner on public.workout_session for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy workout_log_owner on public.workout_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exercise: read all; insert only own customs; update/delete own customs.
create policy exercise_select on public.exercise for select to authenticated using (true);
create policy exercise_insert_own_custom on public.exercise for insert to authenticated
  with check (owner_id = auth.uid() and is_custom = true);
create policy exercise_modify_own_custom on public.exercise for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy exercise_delete_own_custom on public.exercise for delete to authenticated
  using (owner_id = auth.uid());

-- feed_event: read all authenticated; no client writes (triggers run as definer).
create policy feed_event_select on public.feed_event for select to authenticated using (true);

-- daily_goal_hit: not exposed to clients (no policies => deny all).

-- =====================================================================
-- Realtime: feed_event broadcasts.
-- =====================================================================
alter publication supabase_realtime add table public.feed_event;

-- =====================================================================
-- Seed: ~50 standard lifts (owner_id null, is_custom false).
-- =====================================================================
insert into public.exercise (name, is_custom, owner_id) values
  ('Back Squat', false, null),
  ('Front Squat', false, null),
  ('Bulgarian Split Squat', false, null),
  ('Lunge', false, null),
  ('Leg Press', false, null),
  ('Leg Extension', false, null),
  ('Leg Curl', false, null),
  ('Romanian Deadlift', false, null),
  ('Conventional Deadlift', false, null),
  ('Sumo Deadlift', false, null),
  ('Hip Thrust', false, null),
  ('Glute Bridge', false, null),
  ('Calf Raise', false, null),
  ('Seated Calf Raise', false, null),
  ('Bench Press', false, null),
  ('Incline Bench Press', false, null),
  ('Decline Bench Press', false, null),
  ('Dumbbell Bench Press', false, null),
  ('Incline Dumbbell Press', false, null),
  ('Push-up', false, null),
  ('Dip', false, null),
  ('Cable Fly', false, null),
  ('Pec Deck', false, null),
  ('Overhead Press', false, null),
  ('Seated Dumbbell Press', false, null),
  ('Arnold Press', false, null),
  ('Lateral Raise', false, null),
  ('Front Raise', false, null),
  ('Rear Delt Fly', false, null),
  ('Face Pull', false, null),
  ('Pull-up', false, null),
  ('Chin-up', false, null),
  ('Lat Pulldown', false, null),
  ('Barbell Row', false, null),
  ('Pendlay Row', false, null),
  ('Dumbbell Row', false, null),
  ('Cable Row', false, null),
  ('T-Bar Row', false, null),
  ('Shrug', false, null),
  ('Barbell Curl', false, null),
  ('Dumbbell Curl', false, null),
  ('Hammer Curl', false, null),
  ('Preacher Curl', false, null),
  ('Cable Curl', false, null),
  ('Tricep Pushdown', false, null),
  ('Overhead Tricep Extension', false, null),
  ('Skullcrusher', false, null),
  ('Close-Grip Bench Press', false, null),
  ('Plank', false, null),
  ('Hanging Leg Raise', false, null),
  ('Cable Crunch', false, null),
  ('Russian Twist', false, null);
