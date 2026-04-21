function buildLabelMap(options = []) {
  return Object.fromEntries(options.map((option) => [option.value, option.title]))
}

export const experienceOptions = [
  {
    value: 'foundation',
    title: 'Foundation phase',
    caption: 'New to structured coaching, ready to learn key lifts and training language.'
  },
  {
    value: 'intermediate',
    title: 'Training consistently',
    caption: 'Comfortable with major movements, want sharper programming and feedback.'
  },
  {
    value: 'advanced',
    title: 'Performance focused',
    caption: 'Years of consistent training and looking for advanced progression models.'
  }
]

export const goalOptions = [
  {
    value: 'fat-loss',
    title: 'Lean and athletic',
    caption: 'Prioritise fat loss while protecting strength and performance.'
  },
  {
    value: 'muscle-gain',
    title: 'Build muscle density',
    caption: 'Structured hypertrophy blocks with enough recovery to grow.'
  },
  {
    value: 'performance',
    title: 'Raise performance ceiling',
    caption: 'Blend strength, conditioning, and mobility for a complete engine.'
  }
]

export const frequencyOptions = [
  {
    value: '2-sessions',
    title: '2 sessions / week',
    caption: 'Balanced progress alongside a busy calendar.'
  },
  {
    value: '3-4-sessions',
    title: '3–4 sessions / week',
    caption: 'Sweet spot for most strength and body composition goals.'
  },
  {
    value: '5-plus-sessions',
    title: '5+ sessions / week',
    caption: 'High frequency, best with dedicated recovery practices.'
  }
]

export const nutritionOptions = [
  {
    value: 'calorie-deficit',
    title: 'Eat less to lose fat',
    caption: 'Eat a little less than your body uses each day.'
  },
  {
    value: 'maintenance',
    title: 'Maintain your weight',
    caption: 'Eat about the same amount your body uses each day.'
  },
  {
    value: 'calorie-surplus',
    title: 'Eat more to build muscle',
    caption: 'Eat a little more to support muscle gain.'
  }
]

export const trainingSetupOptions = [
  {
    value: 'home-bodyweight',
    title: 'Home · bodyweight only',
    caption: 'Mostly floor space, a mat, or basic household setup with no reliable equipment.'
  },
  {
    value: 'home-basic-kit',
    title: 'Home · basic kit',
    caption: 'Usually have dumbbells, bands, kettlebells, or a bench available.'
  },
  {
    value: 'gym-full-access',
    title: 'Gym · full access',
    caption: 'Can reliably use barbells, machines, cables, cardio, and strength equipment.'
  },
  {
    value: 'mixed-access',
    title: 'Mixed setup',
    caption: 'Switch between home, gym, travel, or changing equipment access week to week.'
  }
]

export const movementLimitationOptions = [
  {
    value: 'none',
    title: 'No current restrictions',
    caption: 'No recurring issue that needs exercise selection or loading adjusted right now.'
  },
  {
    value: 'knees',
    title: 'Knees',
    caption: 'Prefer lower-impact choices or a more careful approach to squats, lunges, and jumps.'
  },
  {
    value: 'lower-back',
    title: 'Lower back',
    caption: 'Need conservative spinal loading and hinge volume, especially under fatigue.'
  },
  {
    value: 'shoulders',
    title: 'Shoulders',
    caption: 'Need care with pressing, overhead work, or end-range upper-body positions.'
  },
  {
    value: 'impact',
    title: 'Impact tolerance',
    caption: 'Need low-impact options for running, jumping, repeated landing, or high-impact cardio.'
  }
]

export const sessionDurationOptions = [
  {
    value: 'under-30-min',
    title: 'Under 30 min',
    caption: 'Short, efficient sessions that fit a tight schedule.'
  },
  {
    value: '30-45-min',
    title: '30–45 min',
    caption: 'Enough time for focused strength or conditioning without a long block.'
  },
  {
    value: '45-60-min',
    title: '45–60 min',
    caption: 'Balanced session length for most progressive training plans.'
  },
  {
    value: '60-plus-min',
    title: '60+ min',
    caption: 'Longer sessions with room for warm-up, main work, and accessories.'
  }
]

export const EXPERIENCE_VALUES = new Set(experienceOptions.map((option) => option.value))
export const GOAL_VALUES = new Set(goalOptions.map((option) => option.value))
export const FREQUENCY_VALUES = new Set(frequencyOptions.map((option) => option.value))
export const NUTRITION_VALUES = new Set(nutritionOptions.map((option) => option.value))
export const TRAINING_SETUP_VALUES = new Set(trainingSetupOptions.map((option) => option.value))
export const MOVEMENT_LIMITATION_VALUES = new Set(movementLimitationOptions.map((option) => option.value))
export const SESSION_DURATION_VALUES = new Set(sessionDurationOptions.map((option) => option.value))

export const DEFAULT_TRAINING_SETUP = 'mixed-access'
export const DEFAULT_MOVEMENT_LIMITATIONS = Object.freeze(['none'])
export const DEFAULT_SESSION_DURATION = '45-60-min'

export const frequencySessionCountMap = {
  '2-sessions': 2,
  '3-4-sessions': 4,
  '5-plus-sessions': 5
}

export const sessionDurationMinutesMap = {
  'under-30-min': 25,
  '30-45-min': 40,
  '45-60-min': 55,
  '60-plus-min': 75
}

export const onboardingLabelMaps = {
  experience: buildLabelMap(experienceOptions),
  goal: buildLabelMap(goalOptions),
  frequency: buildLabelMap(frequencyOptions),
  nutrition: buildLabelMap(nutritionOptions),
  trainingSetup: buildLabelMap(trainingSetupOptions),
  movementLimitation: buildLabelMap(movementLimitationOptions),
  sessionDuration: buildLabelMap(sessionDurationOptions)
}

export function normalizeMovementLimitations(value) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  const normalized = [...new Set(
    rawValues
      .map((item) => String(item || '').trim())
      .filter((item) => MOVEMENT_LIMITATION_VALUES.has(item))
  )]

  if (!normalized.length) return [...DEFAULT_MOVEMENT_LIMITATIONS]

  const withoutNone = normalized.filter((item) => item !== 'none')
  return withoutNone.length ? withoutNone : [...DEFAULT_MOVEMENT_LIMITATIONS]
}

export function formatMovementLimitationLabels(values = []) {
  const normalized = normalizeMovementLimitations(values)
  return normalized.map((value) => onboardingLabelMaps.movementLimitation[value] || value)
}
