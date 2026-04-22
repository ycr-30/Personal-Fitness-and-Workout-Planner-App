import { mealTypeOptions, parseDateValue, toDateKey } from './mealTimeResolver'

export function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function roundNutrition(value, digits = 1) {
  const factor = 10 ** digits
  return Math.round(toNumber(value, 0) * factor) / factor
}

export function clampPercent(value) {
  return Math.min(100, Math.max(0, Math.round(toNumber(value, 0))))
}

export function resolveEffectiveTargets(goals) {
  const source = goals || {}
  const useAi = Boolean(source.use_ai_targets)
  return {
    goalType: source.goal_type || 'maintenance',
    useAiTargets: useAi,
    calories: toNumber(useAi ? source.ai_calories_target : source.calories_target),
    protein: toNumber(useAi ? source.ai_protein_target_g : source.protein_target_g),
    carbs: toNumber(useAi ? source.ai_carbs_target_g : source.carbs_target_g),
    fat: toNumber(useAi ? source.ai_fat_target_g : source.fat_target_g),
    water: toNumber(source.water_target_ml, 2500),
    aiCalories: toNumber(source.ai_calories_target),
    aiProtein: toNumber(source.ai_protein_target_g),
    aiCarbs: toNumber(source.ai_carbs_target_g),
    aiFat: toNumber(source.ai_fat_target_g),
    customCalories: toNumber(source.calories_target),
    customProtein: toNumber(source.protein_target_g),
    customCarbs: toNumber(source.carbs_target_g),
    customFat: toNumber(source.fat_target_g)
  }
}

export function buildDefaultNutritionTargets({ weightKg, goalType = 'maintenance', intakeTarget = 0 }) {
  const safeWeight = Math.max(45, toNumber(weightKg, 70))

  let calories = toNumber(intakeTarget, 0)
  if (!calories) {
    if (goalType === 'fat_loss') calories = Math.round(safeWeight * 27)
    else if (goalType === 'muscle_gain') calories = Math.round(safeWeight * 33)
    else calories = Math.round(safeWeight * 30)
  }

  const protein = Math.round(safeWeight * (goalType === 'muscle_gain' ? 2.2 : 2))
  const fat = Math.round(safeWeight * (goalType === 'fat_loss' ? 0.8 : 0.9))
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))

  return {
    goal_type: goalType,
    calories_target: calories,
    protein_target_g: protein,
    carbs_target_g: carbs,
    fat_target_g: fat,
    water_target_ml: 2500,
    ai_calories_target: calories,
    ai_protein_target_g: protein,
    ai_carbs_target_g: carbs,
    ai_fat_target_g: fat,
    use_ai_targets: true
  }
}

export function calculateRemaining(target, consumed) {
  return roundNutrition(Math.max(toNumber(target) - toNumber(consumed), 0), 0)
}

export function calculateEntryFromFood({ food, quantity, unit }) {
  const qty = Math.max(0, toNumber(quantity))
  const normalizedUnit = unit === 'serving' ? 'serving' : 'g'
  const servingSize = toNumber(food?.servingSizeG || food?.serving_size_g)
  const quantityG =
    normalizedUnit === 'g'
      ? qty
      : servingSize > 0
        ? qty * servingSize
        : 0

  const factorFrom100g = quantityG > 0 ? quantityG / 100 : 0
  const calories =
    normalizedUnit === 'serving' && toNumber(food?.caloriesPerServing) > 0
      ? qty * toNumber(food?.caloriesPerServing)
      : factorFrom100g * toNumber(food?.caloriesPer100g)
  const protein =
    normalizedUnit === 'serving' && toNumber(food?.proteinPerServing) > 0
      ? qty * toNumber(food?.proteinPerServing)
      : factorFrom100g * toNumber(food?.proteinPer100g)
  const carbs =
    normalizedUnit === 'serving' && toNumber(food?.carbsPerServing) > 0
      ? qty * toNumber(food?.carbsPerServing)
      : factorFrom100g * toNumber(food?.carbsPer100g)
  const fat =
    normalizedUnit === 'serving' && toNumber(food?.fatPerServing) > 0
      ? qty * toNumber(food?.fatPerServing)
      : factorFrom100g * toNumber(food?.fatPer100g)

  return {
    quantity: qty,
    unit: normalizedUnit,
    quantityG: quantityG || null,
    servingCount: normalizedUnit === 'serving' ? qty : null,
    calories: roundNutrition(calories, 0),
    proteinG: roundNutrition(protein),
    carbsG: roundNutrition(carbs),
    fatG: roundNutrition(fat)
  }
}

export function deriveFoodBaseFromEntry(entry) {
  if (!entry) return null
  const quantity = Math.max(toNumber(entry.quantity, 1), 1)
  const unit = entry.unit === 'serving' ? 'serving' : 'g'
  const quantityG = toNumber(entry.quantityG)
  const factor100g = quantityG > 0 ? quantityG / 100 : 0

  return {
    id: entry.foodId || null,
    foodName: entry.foodNameSnapshot || entry.foodName || 'Food entry',
    brand: entry.brandSnapshot || entry.brand || '',
    servingLabel: '1 serving',
    servingSizeG: unit === 'serving' && quantity > 0 && quantityG > 0 ? quantityG / quantity : null,
    caloriesPer100g: factor100g > 0 ? roundNutrition(toNumber(entry.calories) / factor100g, 1) : 0,
    proteinPer100g: factor100g > 0 ? roundNutrition(toNumber(entry.proteinG) / factor100g, 1) : 0,
    carbsPer100g: factor100g > 0 ? roundNutrition(toNumber(entry.carbsG) / factor100g, 1) : 0,
    fatPer100g: factor100g > 0 ? roundNutrition(toNumber(entry.fatG) / factor100g, 1) : 0,
    caloriesPerServing: unit === 'serving' ? roundNutrition(toNumber(entry.calories) / quantity, 0) : 0,
    proteinPerServing: unit === 'serving' ? roundNutrition(toNumber(entry.proteinG) / quantity, 1) : 0,
    carbsPerServing: unit === 'serving' ? roundNutrition(toNumber(entry.carbsG) / quantity, 1) : 0,
    fatPerServing: unit === 'serving' ? roundNutrition(toNumber(entry.fatG) / quantity, 1) : 0,
    isCustom: Boolean(entry.isCustom)
  }
}

export function groupEntriesByMeal(entries) {
  const base = Object.fromEntries(mealTypeOptions.map((item) => [item.id, []]))
  ;(entries || []).forEach((item) => {
    const key = item.mealType || 'snacks'
    if (!base[key]) base[key] = []
    base[key].push(item)
  })
  return base
}

export function summarizeMealEntries(entries) {
  return (entries || []).reduce(
    (acc, item) => {
      acc.calories += toNumber(item.calories)
      acc.protein += toNumber(item.proteinG)
      acc.carbs += toNumber(item.carbsG)
      acc.fat += toNumber(item.fatG)
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

export function summarizeWaterEntries(entries) {
  return (entries || []).reduce((sum, item) => sum + toNumber(item.amountMl), 0)
}

export function calculateGoalCompletion({ effectiveTargets, consumed, waterMl }) {
  const caloriesPercent =
    effectiveTargets.calories > 0 ? Math.min(toNumber(consumed.calories) / effectiveTargets.calories, 1) : 0
  const proteinPercent =
    effectiveTargets.protein > 0 ? Math.min(toNumber(consumed.protein) / effectiveTargets.protein, 1) : 0
  const waterPercent =
    effectiveTargets.water > 0 ? Math.min(toNumber(waterMl) / effectiveTargets.water, 1) : 0

  return {
    caloriesPercent: clampPercent(caloriesPercent * 100),
    proteinPercent: clampPercent(proteinPercent * 100),
    waterPercent: clampPercent(waterPercent * 100),
    overallPercent: clampPercent(((caloriesPercent + proteinPercent + waterPercent) / 3) * 100)
  }
}

export function buildNutritionSummary({ mealEntries, waterEntries, goals, exerciseBurn = 0 }) {
  const effectiveTargets = resolveEffectiveTargets(goals)
  const consumed = summarizeMealEntries(mealEntries)
  const waterMl = summarizeWaterEntries(waterEntries)
  const groupedEntries = groupEntriesByMeal(mealEntries)
  const mealBreakdown = Object.fromEntries(
    mealTypeOptions.map((meal) => [meal.id, summarizeMealEntries(groupedEntries[meal.id])])
  )
  const completion = calculateGoalCompletion({
    effectiveTargets,
    consumed,
    waterMl
  })

  return {
    consumedCalories: roundNutrition(consumed.calories, 0),
    remainingCalories: calculateRemaining(effectiveTargets.calories, consumed.calories),
    proteinG: roundNutrition(consumed.protein),
    carbsG: roundNutrition(consumed.carbs),
    fatG: roundNutrition(consumed.fat),
    waterMl: roundNutrition(waterMl, 0),
    exerciseBurn: roundNutrition(exerciseBurn, 0),
    targets: effectiveTargets,
    groupedEntries,
    mealBreakdown,
    completion
  }
}

export function buildTrendSeries({ mealEntries, waterEntries, startDate, endDate }) {
  const mealByDay = new Map()
  const waterByDay = new Map()
  const mealCountByDay = new Map()
  const waterCountByDay = new Map()

  ;(mealEntries || []).forEach((entry) => {
    const key = entry.entryDate || entry.entry_date || ''
    if (!key) return
    const totals = mealByDay.get(key) || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    totals.calories += toNumber(entry.calories)
    totals.protein += toNumber(entry.proteinG || entry.protein_g)
    totals.carbs += toNumber(entry.carbsG || entry.carbs_g)
    totals.fat += toNumber(entry.fatG || entry.fat_g)
    mealByDay.set(key, totals)
    mealCountByDay.set(key, toNumber(mealCountByDay.get(key)) + 1)
  })

  ;(waterEntries || []).forEach((entry) => {
    const key = entry.entryDate || entry.entry_date || ''
    if (!key) return
    waterByDay.set(key, toNumber(waterByDay.get(key)) + toNumber(entry.amountMl || entry.amount_ml))
    waterCountByDay.set(key, toNumber(waterCountByDay.get(key)) + 1)
  })

  const rows = []
  let cursor = parseDateValue(startDate) || new Date()
  const end = parseDateValue(endDate) || new Date()

  while (cursor <= end) {
    const key = toDateKey(cursor)
    const meal = mealByDay.get(key) || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    rows.push({
      date: new Date(cursor),
      key,
      calories: roundNutrition(meal.calories, 0),
      protein: roundNutrition(meal.protein),
      carbs: roundNutrition(meal.carbs),
      fat: roundNutrition(meal.fat),
      water: roundNutrition(waterByDay.get(key), 0),
      mealEntryCount: toNumber(mealCountByDay.get(key), 0),
      waterEntryCount: toNumber(waterCountByDay.get(key), 0)
    })
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + 1)
  }

  return rows
}
