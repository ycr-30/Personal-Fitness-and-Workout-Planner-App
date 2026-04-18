alter table if exists public.user_profiles
  alter column height_cm drop not null,
  alter column weight_kg drop not null;

alter table if exists public.user_profiles
  drop constraint if exists user_profiles_height_cm_check;

alter table if exists public.user_profiles
  add constraint user_profiles_height_cm_check
  check (
    height_cm is null
    or (height_cm >= 120 and height_cm <= 230)
  );

alter table if exists public.user_profiles
  drop constraint if exists user_profiles_weight_kg_check;

alter table if exists public.user_profiles
  add constraint user_profiles_weight_kg_check
  check (
    weight_kg is null
    or (weight_kg >= 35 and weight_kg <= 180)
  );
