import { supabase } from './supabaseClient'
import { toDateKey } from '@/utils/mealTimeResolver'

export async function requireNutritionUser() {
  if (!supabase) {
    throw new Error('Supabase is not configured for nutrition tracking.')
  }
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user?.id) {
    throw new Error('Nutrition cloud data requires a Supabase session. Sign in with Google or email code first.')
  }
  return data.user
}

export function isNutritionSessionMissing(error) {
  const message = String(error?.message || error || '')
    .trim()
    .toLowerCase()

  if (!message) return false

  return (
    message.includes('supabase session') ||
    message.includes('auth session missing') ||
    message.includes('session missing') ||
    message.includes('sign in with google or email code first')
  )
}

export function formatSupabaseError(error, fallback = 'Request failed.') {
  if (!error) return fallback
  return error.message || error.details || fallback
}

export function normalizeSearchTerm(value) {
  return String(value || '')
    .trim()
    .replace(/[,%]/g, ' ')
    .replace(/\s+/g, ' ')
}

export function mapFoodRow(row) {
  return {
    id: row.id,
    foodName: row.food_name,
    brand: row.brand || '',
    servingLabel: row.serving_label || '1 serving',
    servingSizeG: row.serving_size_g,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    caloriesPerServing: row.calories_per_serving,
    proteinPerServing: row.protein_per_serving,
    carbsPerServing: row.carbs_per_serving,
    fatPerServing: row.fat_per_serving,
    isBranded: Boolean(row.is_branded)
  }
}

const FOOD_TYPE_RULES = [
  { label: 'Beef', pattern: /\bbeef\b|\bphilly steak\b|\bcheeseburger\b|\bburger\b|\bsteak\b/i },
  { label: 'Chicken', pattern: /\bchicken\b/i },
  { label: 'Turkey', pattern: /\bturkey\b/i },
  { label: 'Ham', pattern: /\bham\b/i },
  { label: 'Pork', pattern: /\bpork\b|\bbacon\b/i },
  { label: 'Fish', pattern: /\bfish\b|\btuna\b|\bsalmon\b/i },
  { label: 'Shrimp', pattern: /\bshrimp\b/i },
  { label: 'Falafel', pattern: /\bfalafel\b/i },
  { label: 'Egg and cheese', pattern: /\begg\b.*\bcheese\b|\bcheese\b.*\begg\b/i },
  { label: 'Peanut butter and jelly', pattern: /\bpeanut butter\b|\bpbj\b|\bjelly\b/i },
  { label: 'Vegetarian', pattern: /\bveggie\b|\bvegetarian\b|\bcauliflower\b/i },
  { label: 'Pizza style', pattern: /\bpizza\b|\bpepperoni\b/i }
]

const FOOD_FORMAT_RULES = [
  { label: 'Bread', pattern: /\bbread\b/i },
  { label: 'Spread', pattern: /\bspread\b/i },
  { label: 'Roll', pattern: /\brolls?\b|\bbun(s)?\b/i },
  { label: 'Slider', pattern: /\bsliders?\b/i },
  { label: 'Breakfast', pattern: /\bbreakfast\b/i },
  { label: 'Club style', pattern: /\bclub\b/i },
  { label: 'Pickle chips', pattern: /\bpickle chips?\b/i },
  { label: 'Snack mix', pattern: /\bsnack mix\b/i },
  { label: 'Frozen sandwich', pattern: /\bfrozen\b|\bhot pocket(s)?\b/i },
  { label: 'Ice cream', pattern: /\bice cream\b/i }
]

export function inferFoodSubtype(foodName = '') {
  const text = String(foodName || '').trim()
  if (!text) return ''

  const labels = []

  for (const rule of FOOD_TYPE_RULES) {
    if (rule.pattern.test(text)) {
      labels.push(rule.label)
      break
    }
  }

  for (const rule of FOOD_FORMAT_RULES) {
    if (rule.pattern.test(text)) {
      labels.push(rule.label)
      break
    }
  }

  if (labels.length) {
    return Array.from(new Set(labels)).join(' · ')
  }

  if (/\bsandwich\b|\bslider\b|\bburger\b|\bhot pocket\b/i.test(text)) {
    return 'Sandwich item'
  }

  return ''
}

export function mapMealEntryRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    entryDate: row.entry_date,
    mealType: row.meal_type,
    foodId: row.food_id,
    foodNameSnapshot: row.food_name_snapshot,
    brandSnapshot: row.brand_snapshot || '',
    quantity: row.quantity,
    unit: row.unit,
    quantityG: row.quantity_g,
    servingCount: row.serving_count,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    isCustom: Boolean(row.is_custom),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapWaterEntryRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    entryDate: row.entry_date,
    amountMl: row.amount_ml,
    createdAt: row.created_at
  }
}

export function todayDateKey() {
  return toDateKey(new Date())
}
