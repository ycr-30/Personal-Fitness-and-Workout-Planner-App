-- KeepFit nutrition tables
-- Run this file inside the Supabase SQL editor before using the new Nutrition page.

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

create table if not exists public.nutrition_foods (
  id uuid primary key default gen_random_uuid(),
  source_key text unique,
  source text not null default 'manual',
  food_name text not null,
  brand text null,
  serving_label text null,
  serving_size_g numeric null,
  calories_per_100g numeric not null default 0,
  protein_per_100g numeric not null default 0,
  carbs_per_100g numeric not null default 0,
  fat_per_100g numeric not null default 0,
  calories_per_serving numeric null,
  protein_per_serving numeric null,
  carbs_per_serving numeric null,
  fat_per_serving numeric null,
  is_branded boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists nutrition_foods_food_name_idx on public.nutrition_foods (lower(food_name));
create index if not exists nutrition_foods_brand_idx on public.nutrition_foods (lower(coalesce(brand, '')));

alter table public.nutrition_foods enable row level security;

drop policy if exists nutrition_foods_read_all on public.nutrition_foods;
create policy nutrition_foods_read_all
on public.nutrition_foods
for select
using (true);

create table if not exists public.user_nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type text not null check (goal_type in ('fat_loss', 'muscle_gain', 'maintenance')),
  calories_target numeric not null default 0,
  protein_target_g numeric not null default 0,
  carbs_target_g numeric not null default 0,
  fat_target_g numeric not null default 0,
  water_target_ml numeric not null default 2500,
  ai_calories_target numeric null,
  ai_protein_target_g numeric null,
  ai_carbs_target_g numeric null,
  ai_fat_target_g numeric null,
  use_ai_targets boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index if not exists user_nutrition_goals_user_id_idx on public.user_nutrition_goals (user_id);

alter table public.user_nutrition_goals enable row level security;

drop policy if exists user_nutrition_goals_select_own on public.user_nutrition_goals;
create policy user_nutrition_goals_select_own
on public.user_nutrition_goals
for select
using (auth.uid() = user_id);

drop policy if exists user_nutrition_goals_insert_own on public.user_nutrition_goals;
create policy user_nutrition_goals_insert_own
on public.user_nutrition_goals
for insert
with check (auth.uid() = user_id);

drop policy if exists user_nutrition_goals_update_own on public.user_nutrition_goals;
create policy user_nutrition_goals_update_own
on public.user_nutrition_goals
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_nutrition_goals_delete_own on public.user_nutrition_goals;
create policy user_nutrition_goals_delete_own
on public.user_nutrition_goals
for delete
using (auth.uid() = user_id);

drop trigger if exists trg_user_nutrition_goals_updated_at on public.user_nutrition_goals;
create trigger trg_user_nutrition_goals_updated_at
before update on public.user_nutrition_goals
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')),
  food_id uuid null references public.nutrition_foods(id) on delete set null,
  food_name_snapshot text not null,
  brand_snapshot text null,
  quantity numeric not null,
  unit text not null check (unit in ('g', 'serving')),
  quantity_g numeric null,
  serving_count numeric null,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  is_custom boolean not null default false,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_entries_user_date_idx on public.meal_entries (user_id, entry_date desc);
create index if not exists meal_entries_user_meal_idx on public.meal_entries (user_id, meal_type, entry_date desc);

alter table public.meal_entries enable row level security;

drop policy if exists meal_entries_select_own on public.meal_entries;
create policy meal_entries_select_own
on public.meal_entries
for select
using (auth.uid() = user_id);

drop policy if exists meal_entries_insert_own on public.meal_entries;
create policy meal_entries_insert_own
on public.meal_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists meal_entries_update_own on public.meal_entries;
create policy meal_entries_update_own
on public.meal_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists meal_entries_delete_own on public.meal_entries;
create policy meal_entries_delete_own
on public.meal_entries
for delete
using (auth.uid() = user_id);

drop trigger if exists trg_meal_entries_updated_at on public.meal_entries;
create trigger trg_meal_entries_updated_at
before update on public.meal_entries
for each row execute function public.set_current_timestamp_updated_at();

create table if not exists public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  amount_ml numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists water_entries_user_date_idx on public.water_entries (user_id, entry_date desc);

alter table public.water_entries enable row level security;

drop policy if exists water_entries_select_own on public.water_entries;
create policy water_entries_select_own
on public.water_entries
for select
using (auth.uid() = user_id);

drop policy if exists water_entries_insert_own on public.water_entries;
create policy water_entries_insert_own
on public.water_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists water_entries_update_own on public.water_entries;
create policy water_entries_update_own
on public.water_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists water_entries_delete_own on public.water_entries;
create policy water_entries_delete_own
on public.water_entries
for delete
using (auth.uid() = user_id);
