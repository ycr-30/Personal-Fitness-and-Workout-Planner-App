import { isSameDay } from './mealTimeResolver'
import { toNumber } from './nutritionCalculations'

export function buildNutritionAlerts({ summary, selectedDate, now = new Date() }) {
  const alerts = []
  const targets = summary?.targets || {}
  const consumedCalories = toNumber(summary?.consumedCalories)
  const protein = toNumber(summary?.proteinG)
  const carbs = toNumber(summary?.carbsG)
  const fat = toNumber(summary?.fatG)
  const water = toNumber(summary?.waterMl)
  const isToday = isSameDay(selectedDate, now)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  if (targets.calories > 0 && isToday && currentMinutes >= 18 * 60 && consumedCalories < targets.calories * 0.4) {
    alerts.push({
      id: 'calories-low',
      tone: 'warning',
      title: 'Calories look low for this time of day',
      message: 'You are still below 40% of your target after 18:00. Add a balanced meal to avoid under-fuelling recovery.'
    })
  }

  if (targets.calories > 0 && consumedCalories > targets.calories * 1.15) {
    alerts.push({
      id: 'calories-high',
      tone: 'danger',
      title: 'Calories are over target',
      message: 'Today’s intake is more than 15% above target. Keep the next meal lighter and protein-focused.'
    })
  }

  if (targets.protein > 0 && isToday && currentMinutes >= 16 * 60 && protein < targets.protein * 0.6) {
    alerts.push({
      id: 'protein-low',
      tone: 'warning',
      title: 'Protein is behind target',
      message: 'Protein intake is still under 60% after 16:00. Prioritise a lean protein source in your next meal.'
    })
  }

  if (targets.water > 0 && isToday && currentMinutes >= 15 * 60 && water < targets.water * 0.5) {
    alerts.push({
      id: 'water-low',
      tone: 'warning',
      title: 'Hydration is low',
      message: 'You are below 50% of your water goal after 15:00. Add 500–750 ml over the next few hours.'
    })
  }

  if (targets.fat > 0 && fat > targets.fat * 1.2) {
    alerts.push({
      id: 'fat-high',
      tone: 'neutral',
      title: 'Fat intake is running high',
      message: 'Fat is already above 120% of target. Keep the next food choice lighter and higher in protein.'
    })
  }

  if (targets.carbs > 0 && carbs > targets.carbs * 1.2) {
    alerts.push({
      id: 'carbs-high',
      tone: 'neutral',
      title: 'Carbs are above target',
      message: 'Carbohydrates are already above target. Shift the next meal toward protein, vegetables, and fluids.'
    })
  }

  if (!alerts.length) {
    alerts.push({
      id: 'balanced',
      tone: 'positive',
      title: 'Nutrition looks balanced',
      message: 'No major red flags right now. Keep protein and hydration steady for the rest of the day.'
    })
  }

  return alerts.slice(0, 4)
}
