export const mealTypeOptions = [
  { id: 'breakfast', label: 'Breakfast', secondary: 'Morning meal', icon: 'B' },
  { id: 'lunch', label: 'Lunch', secondary: 'Midday meal', icon: 'L' },
  { id: 'dinner', label: 'Dinner', secondary: 'Evening meal', icon: 'D' },
  { id: 'snacks', label: 'Snacks', secondary: 'Anytime add-on', icon: 'S' }
]

const mealTypeMap = Object.fromEntries(mealTypeOptions.map((item) => [item.id, item]))

export function parseDateValue(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value)
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDateKey(value) {
  const date = parseDateValue(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isSameDay(left, right) {
  return toDateKey(left) !== '' && toDateKey(left) === toDateKey(right)
}

export function shiftDate(value, offsetDays) {
  const date = parseDateValue(value) || new Date()
  date.setDate(date.getDate() + offsetDays)
  return date
}

export function formatDisplayDate(value) {
  const date = parseDateValue(value) || new Date()
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export function formatChartDate(value) {
  const date = parseDateValue(value) || new Date()
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export function getMealTypeMeta(mealType) {
  return mealTypeMap[mealType] || mealTypeOptions[0]
}

export function resolveMealTypeLabel(mealType) {
  return getMealTypeMeta(mealType).label
}

export function resolveAutoMealType(selectedDate, now = new Date()) {
  if (!isSameDay(selectedDate, now)) return 'breakfast'
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes >= 6 * 60 && minutes <= 11 * 60 + 30) return 'breakfast'
  if (minutes >= 11 * 60 + 31 && minutes <= 16 * 60 + 30) return 'lunch'
  return 'dinner'
}
