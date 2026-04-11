create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  notification_workout_enabled boolean not null default true,
  notification_workout_time text not null default '18:00',
  notification_meal_enabled boolean not null default true,
  notification_meal_time text not null default '12:00',
  notification_hydration_enabled boolean not null default true,
  notification_hydration_interval_min integer not null default 120,
  notification_weekly_review_enabled boolean not null default true,
  notification_weekly_review_day text not null default 'sunday',
  notification_weekly_review_time text not null default '19:00',
  nutrition_default_unit text not null default 'g' check (nutrition_default_unit in ('g', 'serving')),
  nutrition_default_search_mode text not null default 'recent' check (nutrition_default_search_mode in ('recent', 'all')),
  nutrition_water_quick_add_primary_ml integer not null default 250,
  nutrition_water_quick_add_secondary_ml integer not null default 500,
  workout_default_location text null,
  workout_default_duration_min integer not null default 60,
  workout_default_rpe integer not null default 6,
  workout_auto_mark_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_app_settings_user_id_unique unique (user_id)
);

create index if not exists user_app_settings_user_id_idx
on public.user_app_settings (user_id);

alter table public.user_app_settings enable row level security;

drop policy if exists user_app_settings_select_own on public.user_app_settings;
create policy user_app_settings_select_own
on public.user_app_settings
for select
using (auth.uid() = user_id);

drop policy if exists user_app_settings_insert_own on public.user_app_settings;
create policy user_app_settings_insert_own
on public.user_app_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists user_app_settings_update_own on public.user_app_settings;
create policy user_app_settings_update_own
on public.user_app_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_app_settings_delete_own on public.user_app_settings;
create policy user_app_settings_delete_own
on public.user_app_settings
for delete
using (auth.uid() = user_id);

drop trigger if exists trg_user_app_settings_updated_at on public.user_app_settings;
create trigger trg_user_app_settings_updated_at
before update on public.user_app_settings
for each row execute function public.set_current_timestamp_updated_at();
