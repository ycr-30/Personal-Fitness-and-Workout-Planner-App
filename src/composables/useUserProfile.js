import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { getUserStorageKey } from '@/lib/userStorage'

const profile = ref({
  firstName: '',
  lastName: '',
  displayName: '',
  avatar: '',
  sex: 'female',
  birthday: '',
  height: '',
  weight: '',
  updatedAt: null
})

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const syncMeta = ref({
  connected: false,
  source: 'local',
  lastSyncedAt: null,
  accountLabel: ''
})

let activeIdentity = ''

function splitNameParts(value = '') {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ')
  }
}

function normalizeBirthday(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

function normalizeNumericField(value) {
  if (value === null || value === undefined || value === '') return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : ''
}

function pickMetricValue(...values) {
  for (const value of values) {
    const parsed = normalizeNumericField(value)
    if (parsed !== '' && parsed > 0) return parsed
  }
  return ''
}

function readPlanFallback(authUser = null) {
  if (typeof window === 'undefined' || !authUser) return null

  try {
    const raw = window.localStorage.getItem(getUserStorageKey('pf_plan_state', authUser))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const weightRecords = Array.isArray(parsed?.weightRecords) ? parsed.weightRecords : []
    const weightCandidates = weightRecords
      .map((item) => normalizeNumericField(item?.weight))
      .filter((value) => value !== '' && value > 0)
    const latestWeight = weightCandidates.length ? weightCandidates[weightCandidates.length - 1] : ''

    return {
      birthday: parsed?.bodyMetrics?.birthday || '',
      height: parsed?.bodyMetrics?.heightCm ?? '',
      weight: latestWeight ?? parsed?.weight?.current ?? ''
    }
  } catch {
    return null
  }
}

function hasProfileSnapshot(value = {}) {
  return Boolean(
    value?.firstName ||
      value?.lastName ||
      value?.displayName ||
      value?.birthday ||
      value?.avatar ||
      value?.height !== '' ||
      value?.weight !== ''
  )
}

function normalizeUserProfile(source = {}, authUser = null, fallbackSource = null) {
  const authNameParts = splitNameParts(authUser?.name || '')
  const displayName =
    String(source.display_name || source.displayName || authUser?.name || '')
      .trim()

  const sourceFirstName = String(source.first_name ?? source.firstName ?? '').trim()
  const sourceLastName = String(source.last_name ?? source.lastName ?? '').trim()

  const firstName = sourceFirstName || authNameParts.firstName
  const lastName = sourceLastName || authNameParts.lastName

  return {
    firstName,
    lastName,
    displayName: displayName || `${firstName} ${lastName}`.trim(),
    avatar: String(source.avatar_url ?? source.avatar ?? authUser?.avatar ?? '').trim(),
    sex: String(source.sex || authUser?.sex || 'female').toLowerCase() === 'male' ? 'male' : 'female',
    birthday: normalizeBirthday(source.birthday ?? authUser?.birthday ?? fallbackSource?.birthday),
    height: pickMetricValue(
      source.height_cm,
      source.height,
      authUser?.heightCm,
      authUser?.height_cm,
      authUser?.height,
      fallbackSource?.height_cm,
      fallbackSource?.height
    ),
    weight: pickMetricValue(
      source.weight_kg,
      source.weight,
      authUser?.weightKg,
      authUser?.weight_kg,
      authUser?.weight,
      fallbackSource?.weight_kg,
      fallbackSource?.weight
    ),
    updatedAt: source.updated_at || source.updatedAt || null
  }
}

function buildProfileErrorMessage(err, phase = 'load') {
  const message = String(err?.message || err?.details || '')
    .trim()
    .toLowerCase()

  if (!message) {
    return phase === 'save'
      ? 'Unable to save profile right now. Please try again.'
      : 'Unable to load profile right now. Please try again.'
  }

  if (
    message.includes('user_profiles_height_cm_check') ||
    message.includes('user_profiles_weight_kg_check') ||
    message.includes('violates check constraint')
  ) {
    return phase === 'save'
      ? 'Unable to save profile. Check that height is 120-230 cm and weight is 35-180 kg, or leave them blank after the profile migration is applied.'
      : 'Unable to load profile. Please complete your body metrics or try again later.'
  }

  if (
    message.includes('new row for relation') ||
    message.includes('invalid input syntax') ||
    message.includes('numeric field overflow')
  ) {
    return phase === 'save'
      ? 'Unable to save profile. Please review your body metrics and try again.'
      : 'Unable to load profile. Please complete your body metrics or try again later.'
  }

  return phase === 'save'
    ? 'Unable to save profile right now. Please try again.'
    : 'Unable to load profile right now. Please try again.'
}

function buildUserProfilePayload(nextProfile, userId) {
  const normalized = normalizeUserProfile(nextProfile)
  const firstName = normalized.firstName.trim()
  const lastName = normalized.lastName.trim()
  const displayName = normalized.displayName.trim() || `${firstName} ${lastName}`.trim()

  return {
    user_id: userId,
    first_name: firstName || null,
    last_name: lastName || null,
    display_name: displayName || null,
    avatar_url: normalized.avatar || null,
    sex: normalized.sex || null,
    birthday: normalized.birthday || null,
    height_cm: normalized.height === '' ? null : Number(normalized.height),
    weight_kg: normalized.weight === '' ? null : Number(normalized.weight)
  }
}

async function getSupabaseUser() {
  if (!supabase) return null
  const { data, error: requestError } = await supabase.auth.getUser()
  if (requestError) throw requestError
  return data.user || null
}

function syncAuthSnapshot(auth, nextProfile, supabaseUser = null) {
  if (!auth.user) return
  auth.updateProfile({
    name: nextProfile.displayName || `${nextProfile.firstName} ${nextProfile.lastName}`.trim(),
    avatar: nextProfile.avatar || '',
    sex: nextProfile.sex,
    birthday: nextProfile.birthday || '',
    height: nextProfile.height,
    weight: nextProfile.weight,
    heightCm: nextProfile.height === '' ? null : Number(nextProfile.height),
    weightKg: nextProfile.weight === '' ? null : Number(nextProfile.weight),
    ...(supabaseUser?.email ? { email: supabaseUser.email } : {})
  })
}

async function readUserProfileRow(supabaseUser) {
  const { data, error: selectError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', supabaseUser.id)
    .maybeSingle()

  if (selectError) throw selectError
  return data || null
}

export function useUserProfile() {
  const auth = useAuthStore()

  async function loadProfile({ force = false } = {}) {
    const identity = auth.user?.id || auth.user?.email || auth.user?.account || 'guest'
    if (!force && activeIdentity === identity) return profile.value

    activeIdentity = identity
    loading.value = true
    error.value = ''
    let supabaseUser = null
    const planFallback = readPlanFallback(auth.user)

    try {
      supabaseUser = await getSupabaseUser()
      if (!supabaseUser?.id) {
        const fallback = normalizeUserProfile({}, auth.user, planFallback)
        profile.value = fallback
        syncAuthSnapshot(auth, fallback)
        syncMeta.value = {
          connected: false,
          source: 'local',
          lastSyncedAt: fallback.updatedAt || null,
          accountLabel: auth.user?.email || auth.user?.account || auth.user?.name || 'Current user'
        }
        return fallback
      }

      const row = await readUserProfileRow(supabaseUser)
      const normalized = normalizeUserProfile(row || {}, auth.user, planFallback)
      profile.value = normalized
      syncAuthSnapshot(auth, normalized, supabaseUser)
      syncMeta.value = {
        connected: true,
        source: 'cloud',
        lastSyncedAt: normalized.updatedAt || null,
        accountLabel: supabaseUser.email || auth.user?.email || auth.user?.name || 'Connected account'
      }
      return normalized
    } catch (err) {
      const fallback = normalizeUserProfile({}, auth.user, planFallback)
      error.value = hasProfileSnapshot(fallback) ? '' : buildProfileErrorMessage(err, 'load')
      profile.value = fallback
      if (hasProfileSnapshot(fallback)) {
        syncAuthSnapshot(auth, fallback, supabaseUser)
      }
      syncMeta.value = {
        connected: Boolean(supabaseUser?.id),
        source: supabaseUser?.id ? 'cloud-error' : 'local',
        lastSyncedAt: fallback.updatedAt || null,
        accountLabel:
          supabaseUser?.email ||
          auth.user?.email ||
          auth.user?.account ||
          auth.user?.name ||
          'Current user'
      }
      return fallback
    } finally {
      loading.value = false
    }
  }

  async function saveProfile(nextValues) {
    const normalized = normalizeUserProfile(nextValues, auth.user)
    saving.value = true
    error.value = ''
    profile.value = normalized
    syncAuthSnapshot(auth, normalized)
    let supabaseUser = null

    try {
      supabaseUser = await getSupabaseUser()
      if (!supabaseUser?.id) {
        syncMeta.value = {
          connected: false,
          source: 'local',
          lastSyncedAt: normalized.updatedAt || null,
          accountLabel: auth.user?.email || auth.user?.account || auth.user?.name || 'Current user'
        }
        return {
          profile: normalized,
          cloudSaved: false,
          syncError: false
        }
      }

      const payload = buildUserProfilePayload(nextValues, supabaseUser.id)
      const { data, error: requestError } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (requestError) throw requestError

      const normalized = normalizeUserProfile(data, auth.user)
      profile.value = normalized
      syncAuthSnapshot(auth, normalized, supabaseUser)
      syncMeta.value = {
        connected: true,
        source: 'cloud',
        lastSyncedAt: normalized.updatedAt || null,
        accountLabel: supabaseUser.email || auth.user?.email || auth.user?.name || 'Connected account'
      }
      return {
        profile: normalized,
        cloudSaved: true,
        syncError: false
      }
    } catch (err) {
      error.value = buildProfileErrorMessage(err, 'save')
      syncMeta.value = {
        connected: Boolean(supabaseUser?.id),
        source: supabaseUser?.id ? 'cloud-error' : 'local',
        lastSyncedAt: normalized.updatedAt || null,
        accountLabel:
          supabaseUser?.email ||
          auth.user?.email ||
          auth.user?.account ||
          auth.user?.name ||
          'Current user'
      }
      return {
        profile: normalized,
        cloudSaved: false,
        syncError: true,
        error: error.value
      }
    } finally {
      saving.value = false
    }
  }

  return {
    profile,
    loading,
    saving,
    error,
    syncMeta,
    loadProfile,
    saveProfile
  }
}
