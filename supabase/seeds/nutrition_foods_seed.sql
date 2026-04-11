-- Sample nutrition foods seed
-- Run this after 20260322_nutrition_tables.sql.
-- Replace or extend these rows with your own CSV import later.

insert into public.nutrition_foods (
  source_key,
  source,
  food_name,
  brand,
  serving_label,
  serving_size_g,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  calories_per_serving,
  protein_per_serving,
  carbs_per_serving,
  fat_per_serving,
  is_branded
)
values
  ('seed-chicken-breast', 'seed', 'Chicken Breast', null, '1 serving', 120, 165, 31, 0, 3.6, 198, 37.2, 0, 4.3, false),
  ('seed-salmon', 'seed', 'Salmon Fillet', null, '1 serving', 125, 208, 20.4, 0, 13, 260, 25.5, 0, 16.3, false),
  ('seed-greek-yogurt', 'seed', 'Greek Yogurt', null, '1 serving', 170, 73, 10, 3.9, 0.4, 124, 17, 6.6, 0.7, false),
  ('seed-oats', 'seed', 'Rolled Oats', null, '1 serving', 40, 389, 16.9, 66.3, 6.9, 156, 6.8, 26.5, 2.8, false),
  ('seed-rice', 'seed', 'Cooked White Rice', null, '1 serving', 150, 130, 2.7, 28.2, 0.3, 195, 4.1, 42.3, 0.5, false),
  ('seed-potato', 'seed', 'Boiled Potato', null, '1 serving', 180, 87, 1.9, 20.1, 0.1, 157, 3.4, 36.2, 0.2, false),
  ('seed-banana', 'seed', 'Banana', null, '1 serving', 118, 89, 1.1, 22.8, 0.3, 105, 1.3, 26.9, 0.4, false),
  ('seed-egg', 'seed', 'Whole Egg', null, '1 serving', 50, 143, 12.6, 0.7, 9.5, 72, 6.3, 0.4, 4.8, false),
  ('seed-avocado', 'seed', 'Avocado', null, '1 serving', 70, 160, 2, 8.5, 14.7, 112, 1.4, 6, 10.3, false),
  ('seed-whey', 'seed', 'Whey Protein Powder', 'Generic', '1 scoop', 30, 400, 80, 10, 6, 120, 24, 3, 1.8, true),
  ('seed-protein-bar', 'seed', 'Protein Bar', 'Sample Brand', '1 bar', 60, 350, 33, 35, 10, 210, 20, 21, 6, true),
  ('seed-apple', 'seed', 'Apple', null, '1 serving', 182, 52, 0.3, 13.8, 0.2, 95, 0.5, 25.1, 0.4, false)
on conflict (source_key) do update
set
  food_name = excluded.food_name,
  brand = excluded.brand,
  serving_label = excluded.serving_label,
  serving_size_g = excluded.serving_size_g,
  calories_per_100g = excluded.calories_per_100g,
  protein_per_100g = excluded.protein_per_100g,
  carbs_per_100g = excluded.carbs_per_100g,
  fat_per_100g = excluded.fat_per_100g,
  calories_per_serving = excluded.calories_per_serving,
  protein_per_serving = excluded.protein_per_serving,
  carbs_per_serving = excluded.carbs_per_serving,
  fat_per_serving = excluded.fat_per_serving,
  is_branded = excluded.is_branded;
