import { computed, ref, unref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { formatSupabaseError, mapWaterEntryRow, requireNutritionUser } from '@/lib/nutritionSupabase'
import { summarizeWaterEntries } from '@/utils/nutritionCalculations'
import { toDateKey } from '@/utils/mealTimeResolver'

export function useWaterIntake(selectedDate) {
  const auth = useAuthStore()

  function getCacheKey(date = toDateKey(unref(selectedDate))) {
    const userKey =
      auth.user?.id || auth.user?.accountKey || auth.user?.email || auth.user?.name || 'nutrition-user'
    return `pf_nutrition_water:${userKey}:${date}`
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

  const totalWaterMl = computed(() => summarizeWaterEntries(entries.value))

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
        .from('water_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', date)
        .order('created_at', { ascending: false })

      if (requestError) throw requestError
      entries.value = Array.isArray(data) ? data.map((row) => mapWaterEntryRow(row)) : []
      writeCachedEntries(date, entries.value)
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to load water entries.')
    } finally {
      loading.value = false
    }
  }

  async function addWater(amountMl) {
    if (!supabase) throw new Error('Supabase is not configured.')
    saving.value = true
    error.value = ''
    try {
      const user = await requireNutritionUser()
      const { error: insertError } = await supabase.from('water_entries').insert([
        {
          user_id: user.id,
          entry_date: toDateKey(unref(selectedDate)),
          amount_ml: amountMl
        }
      ])
      if (insertError) throw insertError
      await refresh()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pf_nutrition_updated'))
      }
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to add water entry.')
      throw err
    } finally {
      saving.value = false
    }
  }

  async function deleteWater(entryId) {
    if (!supabase || !entryId) return
    saving.value = true
    error.value = ''
    try {
      const user = await requireNutritionUser()
      const { error: deleteError } = await supabase
        .from('water_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id)
      if (deleteError) throw deleteError
      await refresh()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pf_nutrition_updated'))
      }
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to delete water entry.')
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
    totalWaterMl,
    loading,
    saving,
    error,
    refresh,
    addWater,
    deleteWater
  }
}
