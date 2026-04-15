function normalizeLocation(value) {
  return String(value || '').trim()
}

function buildLocationSeedList(workouts = [], defaultLocation = '') {
  const seeded = []
  const normalizedDefault = normalizeLocation(defaultLocation)
  if (normalizedDefault) seeded.push(normalizedDefault)

  workouts.forEach((workout) => {
    const location = normalizeLocation(workout?.location)
    if (location) seeded.push(location)
  })

  return seeded
}

export function buildWorkoutLocationSuggestions(workouts = [], defaultLocation = '') {
  return Array.from(new Set(buildLocationSeedList(workouts, defaultLocation)))
}

export function getLatestWorkoutLocation(workouts = [], defaultLocation = '') {
  const suggestions = buildWorkoutLocationSuggestions(workouts, defaultLocation)
  return suggestions[0] || ''
}
