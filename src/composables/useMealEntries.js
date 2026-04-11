import { computed, ref, unref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { formatSupabaseError, mapMealEntryRow, requireNutritionUser } from '@/lib/nutritionSupabase'
import { groupEntriesByMeal } from '@/utils/nutritionCalculations'
import { mealTypeOptions, toDateKey } from '@/utils/mealTimeResolver'

export function useMealEntries(selectedDate) {
  const auth = useAuthStore()

  function getCacheKey(date = toDateKey(unref(selectedDate))) {
    const userKey =
      auth.user?.id || auth.user?.accountKey || auth.user?.email || auth.user?.name || 'nutrition-user'
    return `pf_nutrition_meals:${userKey}:${date}`
  }

  function readCachedEntries(date = toDateKey(unref(selectedDate))) {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(getCacheKey(date))
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function writeCachedEntries(date, value) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(getCacheKey(date), JSON.stringify(Array.isArray(value) ? value : []))
    } catch {}
  }

  const entries = ref(readCachedEntries())
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  const groupedEntries = computed(() => groupEntriesByMeal(entries.value))
  const mealCounts = computed(() =>
    Object.fromEntries(mealTypeOptions.map((item) => [item.id, groupedEntries.value[item.id]?.length || 0]))
  )

  async function refresh() {
    if (!supabase) {
      error.value = 'Supabase is not configured.'
      entries.value = []
      return
    }

    loading.value = true
    error.value = ''

    try {
      const user = await requireNutritionUser()
      const date = toDateKey(unref(selectedDate))
      const { data, error: requestError } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', date)
        .order('created_at', { ascending: true })

      if (requestError) throw requestError
      entries.value = Array.isArray(data) ? data.map((row) => mapMealEntryRow(row)) : []
      writeCachedEntries(date, entries.value)
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to load meal entries.')
    } finally {
      loading.value = false
    }
  }

  async function saveEntry(payload) {
    if (!supabase) throw new Error('Supabase is not configured.')
    saving.value = true
    error.value = ''

    try {
      const user = await requireNutritionUser()
      const row = {
        user_id: user.id,
        entry_date: payload.entryDate,
        meal_type: payload.mealType,
        food_id: payload.foodId || null,
        food_name_snapshot: payload.foodNameSnapshot,
        brand_snapshot: payload.brandSnapshot || null,
        quantity: payload.quantity,
        unit: payload.unit,
        quantity_g: payload.quantityG ?? null,
        serving_count: payload.servingCount ?? null,
        calories: payload.calories,
        protein_g: payload.proteinG,
        carbs_g: payload.carbsG,
        fat_g: payload.fatG,
        is_custom: Boolean(payload.isCustom),
        notes: payload.notes || null,
        updated_at: new Date().toISOString()
      }

      if (payload.id) {
        const { error: updateError } = await supabase
          .from('meal_entries')
          .update(row)
          .eq('id', payload.id)
          .eq('user_id', user.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('meal_entries').insert([row])
        if (insertError) throw insertError
      }

      await refresh()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pf_nutrition_updated'))
      }
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to save food entry.')
      throw err
    } finally {
      saving.value = false
    }
  }

  async function deleteEntry(entryId) {
    if (!supabase || !entryId) return
    saving.value = true
    error.value = ''
    try {
      const user = await requireNutritionUser()
      const { error: deleteError } = await supabase
        .from('meal_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id)
      if (deleteError) throw deleteError

      await refresh()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pf_nutrition_updated'))
      }
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to delete food entry.')
      throw err
    } finally {
      saving.value = false
    }
  }

  watch(
    () => toDateKey(unref(selectedDate)),
    (date) => {
      entries.value = readCachedEntries(date)
      refresh()
    },
    { immediate: true }
  )

  return {
    entries,
    groupedEntries,
    mealCounts,
    loading,
    saving,
    error,
    refresh,
    saveEntry,
    deleteEntry
  }
}
