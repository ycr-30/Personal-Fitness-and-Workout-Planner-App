import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { formatSupabaseError } from '@/lib/nutritionSupabase'
import { getUserStorageKey } from '@/lib/userStorage'
import {
  buildUserSettingsPayload,
  defaultUserSettings,
  getNutritionGoalsCacheKey,
  getNutritionMealsCachePrefix,
  getNutritionRecommendationCacheKey,
  getNutritionWaterCachePrefix,
  listUserScopedCacheKeys,
  normalizeUserSettings,
  readCachedUserSettings,
  removeCachedUserSettings,
  writeCachedUserSettings
} from '@/lib/userSettings'

const settings = ref({ ...defaultUserSettings })
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const syncMeta = ref({
  connected: false,
  source: 'default',
  lastSyncedAt: null,
  accountLabel: ''
})

let activeIdentity = ''

function emitSettingsUpdated(detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('pf_user_settings_updated', {
      detail
    })
  )
}

async function getSupabaseUser() {
  if (!supabase) return null
  try {
    const { data, error: requestError } = await supabase.auth.getUser()
    if (requestError) throw requestError
    return data.user || null
  } catch {
    return null
  }
}

function syncAuthSnapshot(auth, nextSettings) {
  if (!auth.user) return
  const updates = {}
  if (auth.user.theme !== nextSettings.theme) updates.theme = nextSettings.theme
  if (auth.user.unit !== nextSettings.unit_system) updates.unit = nextSettings.unit_system
  if (Object.keys(updates).length) auth.updateProfile(updates)
}

async function ensureSettingsRow(auth, supabaseUser) {
  const { data, error: selectError } = await supabase
    .from('user_app_settings')
    .select('*')
    .eq('user_id', supabaseUser.id)
    .maybeSingle()

  if (selectError) throw selectError
  if (data) return data

  const seed = {
    ...buildUserSettingsPayload({
      ...defaultUserSettings,
      theme: auth.user?.theme || defaultUserSettings.theme,
      unit_system: auth.user?.unit || defaultUserSettings.unit_system
    }),
    user_id: supabaseUser.id
  }

  const { data: inserted, error: insertError } = await supabase
    .from('user_app_settings')
    .insert([seed])
    .select('*')
    .single()

  if (insertError) throw insertError
  return inserted
}

export function useUserSettings() {
  const auth = useAuthStore()

  async function loadSettings({ force = false } = {}) {
    const identity = auth.user?.id || auth.user?.accountKey || auth.user?.email || auth.user?.name || 'guest'
    const cached = readCachedUserSettings(auth.user)

    if (cached) {
      settings.value = cached
      syncAuthSnapshot(auth, cached)
      syncMeta.value = {
        ...syncMeta.value,
        source: 'cache',
        accountLabel: auth.user?.email || auth.user?.account || auth.user?.name || 'Current user'
      }
    }

    if (!force && activeIdentity === identity) return settings.value

    activeIdentity = identity
    loading.value = true
    error.value = ''

    try {
      const supabaseUser = await getSupabaseUser()
      if (!supabaseUser?.id) {
        if (!cached) {
          const fallback = normalizeUserSettings({
            ...defaultUserSettings,
            theme: auth.user?.theme || defaultUserSettings.theme,
            unit_system: auth.user?.unit || defaultUserSettings.unit_system
          })
          settings.value = fallback
          writeCachedUserSettings(auth.user, fallback)
        }
        syncMeta.value = {
          connected: false,
          source: cached ? 'cache' : 'default',
          lastSyncedAt: settings.value.updated_at || null,
          accountLabel: auth.user?.email || auth.user?.account || auth.user?.name || 'Current user'
        }
        return settings.value
      }

      const row = await ensureSettingsRow(auth, supabaseUser)
      const normalized = normalizeUserSettings(row)
      settings.value = normalized
      writeCachedUserSettings(auth.user, normalized)
      syncAuthSnapshot(auth, normalized)
      syncMeta.value = {
        connected: true,
        source: 'cloud',
        lastSyncedAt: normalized.updated_at || null,
        accountLabel: supabaseUser.email || auth.user?.email || auth.user?.account || 'Connected account'
      }
      return normalized
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to load app settings.')
      if (!cached) {
        const fallback = normalizeUserSettings(defaultUserSettings)
        settings.value = fallback
      }
      return settings.value
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(nextValues) {
    const normalized = normalizeUserSettings(nextValues)
    saving.value = true
    error.value = ''
    settings.value = normalized
    writeCachedUserSettings(auth.user, settings.value)
    syncAuthSnapshot(auth, settings.value)

    try {
      const supabaseUser = await getSupabaseUser()
      if (!supabaseUser?.id) {
        syncMeta.value = {
          connected: false,
          source: 'cache',
          lastSyncedAt: settings.value.updated_at || null,
          accountLabel: auth.user?.email || auth.user?.account || auth.user?.name || 'Current user'
        }
        emitSettingsUpdated({ settings: settings.value, cloudSaved: false })
        return {
          settings: settings.value,
          cloudSaved: false
        }
      }

      const payload = {
        user_id: supabaseUser.id,
        ...buildUserSettingsPayload(normalized)
      }

      const { data, error: requestError } = await supabase
        .from('user_app_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (requestError) throw requestError

      settings.value = normalizeUserSettings(data)
      writeCachedUserSettings(auth.user, settings.value)
      syncAuthSnapshot(auth, settings.value)
      syncMeta.value = {
        connected: true,
        source: 'cloud',
        lastSyncedAt: settings.value.updated_at || null,
        accountLabel: supabaseUser.email || auth.user?.email || auth.user?.account || 'Connected account'
      }
      emitSettingsUpdated({ settings: settings.value, cloudSaved: true })
      return {
        settings: settings.value,
        cloudSaved: true
      }
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to save settings.')
      emitSettingsUpdated({ settings: settings.value, cloudSaved: false })
      return {
        settings: settings.value,
        cloudSaved: false
      }
    } finally {
      saving.value = false
    }
  }

  async function exportUserData() {
    const supabaseUser = await getSupabaseUser()
    const exportedAt = new Date().toISOString()
    const payload = {
      exportedAt,
      account: {
        appUser: auth.user || null,
        supabaseUser: supabaseUser
          ? {
              id: supabaseUser.id,
              email: supabaseUser.email || null
            }
          : null
      },
      settings: settings.value,
      local: {
        planState: typeof window !== 'undefined'
          ? JSON.parse(window.localStorage.getItem(getUserStorageKey('pf_plan_state', auth.user)) || 'null')
          : null,
        workoutLogs: typeof window !== 'undefined'
          ? JSON.parse(window.localStorage.getItem(getUserStorageKey('pf_workout_logs', auth.user)) || '[]')
          : [],
        restDays: typeof window !== 'undefined'
          ? JSON.parse(window.localStorage.getItem(getUserStorageKey('pf_rest_days', auth.user)) || '[]')
          : [],
        nutritionGoalsCache: typeof window !== 'undefined'
          ? JSON.parse(window.localStorage.getItem(getNutritionGoalsCacheKey(auth.user)) || 'null')
          : null,
        nutritionRecommendationCache: typeof window !== 'undefined'
          ? JSON.parse(window.localStorage.getItem(getNutritionRecommendationCacheKey(auth.user)) || 'null')
          : null
      },
      cloud: {}
    }

    if (supabaseUser?.id) {
      const [profileRes, settingsRes, onboardingRes, goalsRes, mealsRes, waterRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', supabaseUser.id).maybeSingle(),
        supabase.from('user_app_settings').select('*').eq('user_id', supabaseUser.id).maybeSingle(),
        supabase.from('user_onboarding_answers').select('*').eq('user_id', supabaseUser.id).maybeSingle(),
        supabase.from('user_nutrition_goals').select('*').eq('user_id', supabaseUser.id).maybeSingle(),
        supabase.from('meal_entries').select('*').eq('user_id', supabaseUser.id).order('entry_date', { ascending: false }),
        supabase.from('water_entries').select('*').eq('user_id', supabaseUser.id).order('entry_date', { ascending: false })
      ])

      payload.cloud = {
        userProfile: profileRes.data || null,
        userAppSettings: settingsRes.data || null,
        userOnboardingAnswers: onboardingRes.data || null,
        nutritionGoals: goalsRes.data || null,
        mealEntries: mealsRes.data || [],
        waterEntries: waterRes.data || []
      }
    }

    if (typeof window !== 'undefined') {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `keepfit-data-${exportedAt.slice(0, 10)}.json`
      link.click()
      window.URL.revokeObjectURL(url)
    }
  }

  function clearLocalCache() {
    if (typeof window === 'undefined') return
    const prefixes = [getNutritionMealsCachePrefix(auth.user), getNutritionWaterCachePrefix(auth.user)]
    const directKeys = listUserScopedCacheKeys(auth.user)
    removeCachedUserSettings(auth.user)
    directKeys.forEach((key) => {
      try {
        window.localStorage.removeItem(key)
      } catch {}
    })
    const keysToRemove = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key))
    emitSettingsUpdated({ clearedCache: true })
  }

  const isCloudConnected = computed(() => syncMeta.value.connected)

  return {
    settings,
    loading,
    saving,
    error,
    syncMeta,
    isCloudConnected,
    loadSettings,
    saveSettings,
    exportUserData,
    clearLocalCache
  }
}
