function toFiniteNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function toPositiveWeightNumber(value) {
  const parsed = toFiniteNumber(value)
  return parsed != null && parsed > 0 ? parsed : null
}

export function hasValidPlanWeight(value) {
  return toPositiveWeightNumber(value) != null
}

function resolveRecordedAt(value, date = '', fallbackIndex = 0) {
  const raw = String(value || '').trim()
  if (raw) {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  const normalizedDate = String(date || '').trim()
  if (!normalizedDate) return ''
  const parsedDate = new Date(`${normalizedDate}T00:00:00.000Z`)
  if (Number.isNaN(parsedDate.getTime())) return ''
  parsedDate.setSeconds(parsedDate.getSeconds() + fallbackIndex)
  return parsedDate.toISOString()
}

export function buildPlanWeightRecord({
  date = '',
  recordedAt = '',
  weight = null,
  bmi = null,
  bodyFat = null,
  height = null,
  fallbackIndex = 0
} = {}) {
  const normalizedDate = String(date || '').trim()
  const normalizedWeight = toPositiveWeightNumber(weight)
  if (!normalizedDate || normalizedWeight == null) return null

  return {
    date: normalizedDate,
    recordedAt: resolveRecordedAt(recordedAt, normalizedDate, fallbackIndex),
    weight: normalizedWeight,
    bmi: toFiniteNumber(bmi),
    bodyFat: toFiniteNumber(bodyFat),
    height: toFiniteNumber(height)
  }
}

export function getPlanWeightRecordTime(record, fallbackIndex = 0) {
  const recordedAt = resolveRecordedAt(record?.recordedAt, record?.date, fallbackIndex)
  const parsed = recordedAt ? new Date(recordedAt).getTime() : Number.NaN
  if (Number.isFinite(parsed)) return parsed
  const parsedDate = record?.date ? new Date(`${record.date}T00:00:00.000Z`).getTime() : Number.NaN
  return Number.isFinite(parsedDate) ? parsedDate + fallbackIndex : fallbackIndex
}

export function sanitizePlanWeightRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record, index) => buildPlanWeightRecord({ ...(record || {}), fallbackIndex: index }))
    .filter(Boolean)
    .sort((a, b) => getPlanWeightRecordTime(a) - getPlanWeightRecordTime(b))
}

function appendSeedWeightRecord(records, recordLike, position = 'end') {
  const normalized = buildPlanWeightRecord(recordLike || {})
  if (!normalized) return records
  const exists = records.some(
    (item) => item.date === normalized.date && Math.abs(Number(item.weight) - Number(normalized.weight)) < 0.05
  )
  if (exists) return records
  return position === 'start' ? [normalized, ...records] : [...records, normalized]
}

function updateMatchingWeightRecordTimestamp(records, weightValue, recordedAt, picker = 'last') {
  const targetWeight = toPositiveWeightNumber(weightValue)
  if (targetWeight == null || !recordedAt) return records
  const matcher = (item) => Math.abs(Number(item.weight) - targetWeight) < 0.05
  const index =
    picker === 'first'
      ? records.findIndex(matcher)
      : (() => {
          for (let i = records.length - 1; i >= 0; i -= 1) {
            if (matcher(records[i])) return i
          }
          return -1
        })()
  if (index < 0) return records
  const next = records.slice()
  next[index] = {
    ...next[index],
    recordedAt: resolveRecordedAt(recordedAt, next[index].date, index)
  }
  return next
}

function normalizeWeightValue(value) {
  const parsed = toPositiveWeightNumber(value)
  return parsed != null ? parsed : ''
}

function normalizeWeightTarget(goalId, focusId, start, current, target) {
  const normalizedTarget = toPositiveWeightNumber(target)
  const latest = toPositiveWeightNumber(current)
  const starting = toPositiveWeightNumber(start)
  const lossAnchor = latest != null ? latest : starting
  const gainAnchor = latest != null ? latest : starting

  if (goalId === 'weight-loss') {
    if (lossAnchor == null) return normalizedTarget != null ? normalizedTarget : ''
    if (normalizedTarget == null || normalizedTarget >= lossAnchor) {
      return Number(Math.max(35, lossAnchor - 3).toFixed(1))
    }
    return normalizedTarget
  }

  if (goalId === 'muscle' && focusId === 'weight-gain') {
    if (gainAnchor == null) return normalizedTarget != null ? normalizedTarget : ''
    if (normalizedTarget == null || normalizedTarget <= gainAnchor) {
      return Number((gainAnchor + 2.5).toFixed(1))
    }
    return normalizedTarget
  }

  return normalizedTarget != null ? normalizedTarget : ''
}

function normalizePlanWeightBlock(weight = {}, { goalId = '', focusId = '', weightRecords = [] } = {}) {
  const records = sanitizePlanWeightRecords(weightRecords)
  const firstRecord = records[0] || null
  const lastRecord = records[records.length - 1] || null

  const startValue =
    toPositiveWeightNumber(weight?.start) ??
    toPositiveWeightNumber(firstRecord?.weight) ??
    toPositiveWeightNumber(lastRecord?.weight)
  const currentValue =
    toPositiveWeightNumber(weight?.current) ??
    toPositiveWeightNumber(lastRecord?.weight) ??
    toPositiveWeightNumber(firstRecord?.weight)

  return {
    start: startValue != null ? startValue : '',
    current: currentValue != null ? currentValue : '',
    target: normalizeWeightTarget(goalId, focusId, startValue, currentValue, weight?.target),
    startDate: String(weight?.startDate || firstRecord?.date || '').trim(),
    targetDate: String(weight?.targetDate || '').trim()
  }
}

function resolveCurrentWeightDate(weight = {}, weightRecords = []) {
  const records = sanitizePlanWeightRecords(weightRecords)
  return String(records[records.length - 1]?.date || weight?.startDate || '').trim()
}

export function sanitizePlanStateSnapshot(planState) {
  if (!planState || typeof planState !== 'object') return null
  const next = { ...planState }
  const baseWeight = planState.weight || {}
  let weightRecords = sanitizePlanWeightRecords(planState.weightRecords)
  const currentWeightDate = resolveCurrentWeightDate(baseWeight, weightRecords)
  weightRecords = appendSeedWeightRecord(
    weightRecords,
    {
      date: String(baseWeight.startDate || weightRecords[0]?.date || '').trim(),
      recordedAt: baseWeight.startDate ? `${baseWeight.startDate}T00:00:00.000Z` : '',
      weight: baseWeight.start
    },
    'start'
  )
  weightRecords = appendSeedWeightRecord(weightRecords, {
    date: currentWeightDate,
    recordedAt: currentWeightDate ? `${currentWeightDate}T23:59:59.000Z` : '',
    weight: baseWeight.current
  })
  weightRecords = updateMatchingWeightRecordTimestamp(
    weightRecords,
    baseWeight.start,
    baseWeight.startDate ? `${baseWeight.startDate}T00:00:00.000Z` : '',
    'first'
  )
  weightRecords = updateMatchingWeightRecordTimestamp(
    weightRecords,
    baseWeight.current,
    currentWeightDate ? `${currentWeightDate}T23:59:59.000Z` : '',
    'last'
  )
  weightRecords = sanitizePlanWeightRecords(weightRecords)
  next.weightRecords = weightRecords
  next.weight = normalizePlanWeightBlock(baseWeight, {
    goalId: String(planState.goalId || '').trim(),
    focusId: String(planState.focusId || '').trim(),
    weightRecords
  })
  return next
}
