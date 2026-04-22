function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeDateKey(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (directMatch) return directMatch[1]

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return toIsoDate(parsed)
}

function toDateSet(restDaysLike) {
  if (restDaysLike instanceof Set) return new Set(restDaysLike)
  if (Array.isArray(restDaysLike)) {
    return new Set(restDaysLike.map((value) => normalizeDateKey(value)).filter(Boolean))
  }
  return new Set()
}

export function isRestSuppressedWorkout(item) {
  return Boolean(item?.restSuppressed)
}

export function sameDateKeySet(left, right) {
  const leftSet = toDateSet(left)
  const rightSet = toDateSet(right)
  if (leftSet.size !== rightSet.size) return false
  for (const value of leftSet) {
    if (!rightSet.has(value)) return false
  }
  return true
}

export function nextRestDaySet(restDaysLike, dateKey, shouldRest) {
  const next = toDateSet(restDaysLike)
  const normalizedDateKey = normalizeDateKey(dateKey)
  if (!normalizedDateKey) return next

  if (shouldRest) next.add(normalizedDateKey)
  else next.delete(normalizedDateKey)
  return next
}

export function updateLogsRestSuppression(logsLike, dateKey, shouldSuppress) {
  const normalizedDateKey = normalizeDateKey(dateKey)
  const source = Array.isArray(logsLike) ? logsLike : []
  if (!normalizedDateKey || !source.length) return source

  let changed = false
  const next = source.map((item) => {
    if (normalizeDateKey(item?.date) !== normalizedDateKey) return item

    const suppressed = isRestSuppressedWorkout(item)
    if (shouldSuppress) {
      if (suppressed) return item
      changed = true
      return {
        ...item,
        restSuppressed: true
      }
    }

    if (!suppressed) return item
    changed = true
    const restored = { ...item }
    delete restored.restSuppressed
    return restored
  })

  return changed ? next : source
}

export function isVisibleWorkout(item, restDaysLike) {
  const normalizedDateKey = normalizeDateKey(item?.date)
  if (!normalizedDateKey) return true
  const restDays = toDateSet(restDaysLike)
  return !(isRestSuppressedWorkout(item) && restDays.has(normalizedDateKey))
}

export function getVisibleWorkoutLogs(logsLike, restDaysLike) {
  const source = Array.isArray(logsLike) ? logsLike : []
  return source.filter((item) => isVisibleWorkout(item, restDaysLike))
}
