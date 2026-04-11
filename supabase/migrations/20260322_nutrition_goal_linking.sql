alter table public.user_nutrition_goals
  add column if not exists goal_source text not null default 'plan',
  add column if not exists goal_override boolean not null default false,
  add column if not exists linked_plan_goal_id text null,
  add column if not exists linked_plan_goal_label text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_nutrition_goals_goal_source_check'
  ) then
    alter table public.user_nutrition_goals
      add constraint user_nutrition_goals_goal_source_check
      check (goal_source in ('plan', 'manual'));
  end if;
end $$;

update public.user_nutrition_goals
set
  goal_source = coalesce(goal_source, 'plan'),
  goal_override = coalesce(goal_override, false)
where goal_source is null or goal_override is null;
