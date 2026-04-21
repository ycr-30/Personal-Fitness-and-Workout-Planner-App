alter table public.user_onboarding_answers
  add column if not exists training_setup text,
  add column if not exists movement_limitations text[] not null default array['none']::text[],
  add column if not exists session_duration text;

update public.user_onboarding_answers
set
  training_setup = coalesce(training_setup, 'mixed-access'),
  movement_limitations = case
    when movement_limitations is null or cardinality(movement_limitations) = 0
      then array['none']::text[]
    else movement_limitations
  end,
  session_duration = coalesce(session_duration, '45-60-min');

alter table public.user_onboarding_answers
  alter column training_setup set default 'mixed-access',
  alter column training_setup set not null,
  alter column movement_limitations set default array['none']::text[],
  alter column movement_limitations set not null,
  alter column session_duration set default '45-60-min',
  alter column session_duration set not null;

alter table public.user_onboarding_answers
  drop constraint if exists user_onboarding_answers_training_setup_check;

alter table public.user_onboarding_answers
  add constraint user_onboarding_answers_training_setup_check
  check (training_setup in ('home-bodyweight', 'home-basic-kit', 'gym-full-access', 'mixed-access'));

alter table public.user_onboarding_answers
  drop constraint if exists user_onboarding_answers_movement_limitations_check;

alter table public.user_onboarding_answers
  add constraint user_onboarding_answers_movement_limitations_check
  check (
    cardinality(movement_limitations) > 0
    and movement_limitations <@ array['none', 'knees', 'lower-back', 'shoulders', 'impact']::text[]
    and not ('none' = any(movement_limitations) and cardinality(movement_limitations) > 1)
  );

alter table public.user_onboarding_answers
  drop constraint if exists user_onboarding_answers_session_duration_check;

alter table public.user_onboarding_answers
  add constraint user_onboarding_answers_session_duration_check
  check (session_duration in ('under-30-min', '30-45-min', '45-60-min', '60-plus-min'));
