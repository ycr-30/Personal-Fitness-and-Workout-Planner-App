const PLAN_GOAL_MAPPINGS = {
  'weight-loss': {
    workoutGoalLabel: 'Full-body fat loss',
    nutritionGoalType: 'fat_loss',
    nutritionGoalLabel: 'Fat loss'
  },
  'local-slim': {
    workoutGoalLabel: 'Tone specific areas',
    nutritionGoalType: 'fat_loss',
    nutritionGoalLabel: 'Fat loss'
  },
  muscle: {
    workoutGoalLabel: 'Build muscle definition',
    nutritionGoalType: 'muscle_gain',
    nutritionGoalLabel: 'Muscle gain'
  },
  health: {
    workoutGoalLabel: 'Stay healthy',
    nutritionGoalType: 'maintenance',
    nutritionGoalLabel: 'Maintenance'
  },
  running: {
    workoutGoalLabel: 'Running performance',
    nutritionGoalType: 'maintenance',
    nutritionGoalLabel: 'Maintenance'
  },
  posture: {
    workoutGoalLabel: 'Posture & physique',
    nutritionGoalType: 'maintenance',
    nutritionGoalLabel: 'Maintenance'
  }
}

const FALLBACK_PLAN_GOAL = {
  workoutGoalLabel: 'No workout goal selected',
  nutritionGoalType: 'maintenance',
  nutritionGoalLabel: 'Maintenance'
}

export function mapWorkoutGoalToNutritionGoal(goalId) {
  const mapping = PLAN_GOAL_MAPPINGS[String(goalId || '').trim()]
  if (!mapping) {
    return {
      goalId: String(goalId || ''),
      ...FALLBACK_PLAN_GOAL
    }
  }
  return {
    goalId: String(goalId || ''),
    ...mapping
  }
}

export function resolveNutritionGoalTypeLabel(goalType) {
  if (goalType === 'fat_loss') return 'Fat loss'
  if (goalType === 'muscle_gain') return 'Muscle gain'
  return 'Maintenance'
}

export function buildPlanGoalLink(planState) {
  const mapped = mapWorkoutGoalToNutritionGoal(planState?.goalId)
  return {
    goalSource: 'plan',
    linked: Boolean(planState?.goalId),
    workoutGoalId: mapped.goalId,
    workoutGoalLabel: mapped.workoutGoalLabel,
    nutritionGoalType: mapped.nutritionGoalType,
    nutritionGoalLabel: mapped.nutritionGoalLabel
  }
}
