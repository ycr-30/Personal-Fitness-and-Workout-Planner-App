import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import {
  formatSupabaseError,
  inferFoodSubtype,
  isNutritionSessionMissing,
  mapFoodRow,
  normalizeSearchTerm,
  requireNutritionUser
} from '@/lib/nutritionSupabase'
import { toDateKey } from '@/utils/mealTimeResolver'

const SEARCH_SELECT_COLUMNS = [
  'id',
  'source_key',
  'food_name',
  'brand',
  'serving_label',
  'serving_size_g',
  'calories_per_100g',
  'protein_per_100g',
  'carbs_per_100g',
  'fat_per_100g',
  'calories_per_serving',
  'protein_per_serving',
  'carbs_per_serving',
  'fat_per_serving',
  'is_branded'
].join(',')

export function useFoodSearch() {
  const query = ref('')
  const filterMode = ref('recent')
  const results = ref([])
  const loading = ref(false)
  const error = ref('')
  const hint = ref('')
  let timer = null
  const recentFoods = ref([])

  function mapSearchResultRow(row) {
    return {
      id: row.source_key,
      sourceKey: row.source_key,
      foodName: row.display_name,
      foodSubtype: inferFoodSubtype(row.display_name),
      brand: row.brand || '',
      servingLabel: row.serving_label || '1 serving',
      servingSizeG: null,
      caloriesPer100g: Number(row.calories_per_100g ?? 0),
      proteinPer100g: Number(row.protein_per_100g ?? 0),
      carbsPer100g: Number(row.carbs_per_100g ?? 0),
      fatPer100g: Number(row.fat_per_100g ?? 0),
      caloriesPerServing: null,
      proteinPerServing: null,
      carbsPerServing: null,
      fatPerServing: null,
      isBranded: Boolean(row.is_branded)
    }
  }

  function cleanDisplayName(value) {
    const source = String(value || '')
      .replace(/^[\s\-_,;:/|]+/g, '')
      .replace(/[\s\-_,;:/|]+$/g, '')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!source) return String(value || '').trim()
    if (/^[A-Z0-9 ,'&()/\-.+]+$/.test(source) && source.length <= 120) {
      return source.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    }
    return source
  }

  function sortAndDeduplicateRows(rows) {
    const seen = new Set()
    return (rows || [])
      .map((row) => {
        const mapped = mapFoodRow(row)
        return {
          ...mapped,
          sourceKey: row.source_key || mapped.id,
          foodName: cleanDisplayName(mapped.foodName),
          foodSubtype: inferFoodSubtype(mapped.foodName)
        }
      })
      .filter((item) => {
        const dedupKey = [
          item.foodName.toLowerCase(),
          String(item.brand || '').toLowerCase(),
          Number(item.caloriesPer100g || 0).toFixed(2),
          Number(item.proteinPer100g || 0).toFixed(2),
          Number(item.carbsPer100g || 0).toFixed(2),
          Number(item.fatPer100g || 0).toFixed(2)
        ].join('|')
        if (seen.has(dedupKey)) return false
        seen.add(dedupKey)
        return true
      })
      .sort((a, b) => a.foodName.length - b.foodName.length)
      .slice(0, 20)
  }

  function filterRecentRows(term = '') {
    const normalized = normalizeSearchTerm(term).toLowerCase()
    if (!normalized) return recentFoods.value.slice(0, 20)
    return recentFoods.value
      .filter((item) =>
        [item.foodName, item.foodSubtype, item.brand, item.servingLabel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized))
      )
      .slice(0, 20)
  }

  async function loadRecentFoods() {
    if (!supabase) return []

    let user = null
    try {
      user = await requireNutritionUser()
    } catch (error) {
      if (isNutritionSessionMissing(error)) {
        recentFoods.value = []
        return []
      }
      throw error
    }
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 6)

    const { data, error: requestError } = await supabase
      .from('meal_entries')
      .select('food_id, created_at')
      .eq('user_id', user.id)
      .eq('is_custom', false)
      .not('food_id', 'is', null)
      .gte('entry_date', toDateKey(startDate))
      .lte('entry_date', toDateKey(endDate))
      .order('created_at', { ascending: false })
      .limit(120)

    if (requestError) throw requestError

    const orderedFoodIds = []
    const seenIds = new Set()
    for (const row of data || []) {
      const foodId = row.food_id
      if (!foodId || seenIds.has(foodId)) continue
      seenIds.add(foodId)
      orderedFoodIds.push(foodId)
    }

    if (!orderedFoodIds.length) {
      recentFoods.value = []
      return []
    }

    const { data: foodRows, error: foodsError } = await supabase
      .from('nutrition_foods')
      .select(SEARCH_SELECT_COLUMNS)
      .in('id', orderedFoodIds)

    if (foodsError) throw foodsError

    const rowMap = new Map((foodRows || []).map((row) => [row.id, row]))
    const orderedRows = orderedFoodIds.map((id) => rowMap.get(id)).filter(Boolean)
    recentFoods.value = sortAndDeduplicateRows(orderedRows)
    return recentFoods.value
  }

  async function directPrefixSearch(term) {
    const prefix = `${term}%`
    const [foodResponse, brandResponse] = await Promise.all([
      supabase
        .from('nutrition_foods')
        .select(SEARCH_SELECT_COLUMNS)
        .ilike('food_name', prefix)
        .limit(60),
      supabase
        .from('nutrition_foods')
        .select(SEARCH_SELECT_COLUMNS)
        .ilike('brand', prefix)
        .limit(20)
    ])

    if (foodResponse.error) throw foodResponse.error
    if (brandResponse.error) throw brandResponse.error
    return sortAndDeduplicateRows([...(foodResponse.data || []), ...(brandResponse.data || [])])
  }

  async function searchAllFoods(normalized) {
    if (!normalized) {
      return {
        results: [],
        hint: 'Type a food name to search all foods.'
      }
    }

    const prefixResults = await directPrefixSearch(normalized)

    if (normalized.length === 1) {
      return {
        results: prefixResults,
        hint: prefixResults.length
          ? `Showing foods that start with "${normalized.toUpperCase()}".`
          : `No foods found starting with "${normalized.toUpperCase()}".`
      }
    }

    if (prefixResults.length && normalized.length <= 2) {
      return {
        results: prefixResults,
        hint: `Showing foods that start with "${normalized}".`
      }
    }

    if (prefixResults.length >= 8) {
      return {
        results: prefixResults,
        hint: `Showing the best prefix matches for "${normalized}".`
      }
    }

    const { data, error: requestError } = await supabase.rpc('search_nutrition_foods_clean', {
      search_text: normalized,
      filter_mode: 'all',
      limit_n: 20
    })

    if (requestError) throw requestError
    const rpcResults = Array.isArray(data) ? data.map((row) => mapSearchResultRow(row)) : []
    return {
      results: rpcResults.length ? rpcResults : prefixResults,
      hint: rpcResults.length
        ? ''
        : prefixResults.length
          ? `Showing foods that start with "${normalized}" because no broader matches were returned.`
          : ''
    }
  }

  async function searchFoods(term = query.value) {
    if (!supabase) {
      error.value = 'Supabase is not configured.'
      results.value = []
      return
    }

    const normalized = normalizeSearchTerm(term)
    error.value = ''
    hint.value = ''

    try {
      if (filterMode.value === 'recent') {
        loading.value = true
        await loadRecentFoods()
        const recentMatches = filterRecentRows(normalized)
        if (!normalized || recentMatches.length) {
          results.value = recentMatches
          hint.value = normalized && recentMatches.length
            ? `Showing recent foods that match "${normalized}".`
            : ''
          return
        }

        const fallback = await searchAllFoods(normalized)
        results.value = fallback.results
        hint.value = fallback.results.length
          ? `No recent matches for "${normalized}". Showing all foods instead.`
          : `No recent matches for "${normalized}", and no foods were found in the full catalog.`
        return
      }

      loading.value = true
      const searchResult = await searchAllFoods(normalized)
      results.value = searchResult.results
      hint.value = searchResult.hint
    } catch (err) {
      const rawMessage = formatSupabaseError(err, 'Unable to load foods.')
      if (rawMessage.includes('statement timeout')) {
        try {
          results.value = await directPrefixSearch(normalized)
          error.value = ''
          hint.value = results.value.length
            ? `Showing foods that start with "${normalized}" because the broader search took too long.`
            : `Search took too long and no foods starting with "${normalized}" were found.`
        } catch (fallbackError) {
          error.value = 'Search took too long. Please try a shorter or more specific food name.'
          results.value = []
        }
      } else {
        error.value = rawMessage
        results.value = []
      }
    } finally {
      loading.value = false
    }
  }

  watch(
    query,
    (value) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        searchFoods(value)
      }, 240)
    },
    { immediate: true }
  )

  watch(
    filterMode,
    async (nextMode) => {
      if (timer) clearTimeout(timer)
      if (nextMode === 'recent') {
        searchFoods(query.value)
        return
      }
      timer = setTimeout(() => {
        searchFoods(query.value)
      }, 120)
    },
    { immediate: false }
  )

  function clearSearch() {
    query.value = ''
  }

  async function resolveSelectedFood(searchItem) {
    if (!supabase || !searchItem?.sourceKey) return null

    const { data, error: requestError } = await supabase
      .from('nutrition_foods')
      .select('*')
      .eq('source_key', searchItem.sourceKey)
      .limit(1)
      .maybeSingle()

    if (requestError) throw requestError
    if (!data) return null

    const mapped = mapFoodRow(data)
    return {
      ...mapped,
      sourceKey: searchItem.sourceKey,
      foodName: searchItem.foodName || mapped.foodName,
      foodSubtype: searchItem.foodSubtype || inferFoodSubtype(searchItem.foodName || mapped.foodName)
    }
  }

  async function resolveFoodById(foodId) {
    if (!supabase || !foodId) return null

    const { data, error: requestError } = await supabase
      .from('nutrition_foods')
      .select('*')
      .eq('id', foodId)
      .limit(1)
      .maybeSingle()

    if (requestError) throw requestError
    if (!data) return null

    const mapped = mapFoodRow(data)
    return {
      ...mapped,
      sourceKey: data.source_key || mapped.id,
      foodSubtype: inferFoodSubtype(mapped.foodName)
    }
  }

  return {
    query,
    filterMode,
    results,
    loading,
    error,
    hint,
    searchFoods,
    clearSearch,
    resolveSelectedFood,
    resolveFoodById
  }
}
