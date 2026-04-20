-- Weight tracking table (one entry per user per day)
create table public.weight_log (
  id         bigserial primary key,
  user_id    uuid not null references public.profile(id) on delete cascade,
  weight_kg  numeric not null,
  logged_at  date not null default current_date,
  unique (user_id, logged_at)
);
create index weight_log_user_idx on public.weight_log (user_id, logged_at desc);

alter table public.weight_log enable row level security;
create policy weight_log_owner on public.weight_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.weight_log to authenticated;
grant usage, select on sequence public.weight_log_id_seq to authenticated;
