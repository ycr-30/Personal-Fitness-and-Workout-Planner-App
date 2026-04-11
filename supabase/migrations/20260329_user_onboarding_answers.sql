create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_onboarding_answers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  experience text not null check (experience in ('foundation', 'intermediate', 'advanced')),
  goal text not null check (goal in ('fat-loss', 'muscle-gain', 'performance')),
  frequency text not null check (frequency in ('2-sessions', '3-4-sessions', '5-plus-sessions')),
  nutrition text not null check (nutrition in ('calorie-deficit', 'maintenance', 'calorie-surplus')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding_answers enable row level security;

drop policy if exists user_onboarding_answers_select_own on public.user_onboarding_answers;
create policy user_onboarding_answers_select_own
on public.user_onboarding_answers
for select
using (auth.uid() = user_id);

drop policy if exists user_onboarding_answers_insert_own on public.user_onboarding_answers;
create policy user_onboarding_answers_insert_own
on public.user_onboarding_answers
for insert
with check (auth.uid() = user_id);

drop policy if exists user_onboarding_answers_update_own on public.user_onboarding_answers;
create policy user_onboarding_answers_update_own
on public.user_onboarding_answers
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_onboarding_answers_delete_own on public.user_onboarding_answers;
create policy user_onboarding_answers_delete_own
on public.user_onboarding_answers
for delete
using (auth.uid() = user_id);

drop trigger if exists trg_user_onboarding_answers_updated_at on public.user_onboarding_answers;
create trigger trg_user_onboarding_answers_updated_at
before update on public.user_onboarding_answers
for each row execute function public.set_current_timestamp_updated_at();
