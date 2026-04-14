import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { formatSupabaseError } from '@/lib/nutritionSupabase'

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

function normalizeUserProfile(source = {}, authUser = null) {
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
    birthday: normalizeBirthday(source.birthday ?? authUser?.birthday),
    height: normalizeNumericField(source.height_cm ?? source.height ?? authUser?.heightCm ?? authUser?.height),
    weight: normalizeNumericField(source.weight_kg ?? source.weight ?? authUser?.weightKg ?? authUser?.weight),
    updatedAt: source.updated_at || source.updatedAt || null
  }
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

async function ensureUserProfileRow(auth, supabaseUser) {
  const { data, error: selectError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', supabaseUser.id)
    .maybeSingle()

  if (selectError) throw selectError
  if (data) return data

  const seed = buildUserProfilePayload(normalizeUserProfile({}, auth.user), supabaseUser.id)
  const { data: inserted, error: insertError } = await supabase
    .from('user_profiles')
    .insert([seed])
    .select('*')
    .single()

  if (insertError) throw insertError
  return inserted
}

export function useUserProfile() {
  const auth = useAuthStore()

  async function loadProfile({ force = false } = {}) {
    const identity = auth.user?.id || auth.user?.email || auth.user?.account || 'guest'
    if (!force && activeIdentity === identity) return profile.value

    activeIdentity = identity
    loading.value = true
    error.value = ''

    try {
      const supabaseUser = await getSupabaseUser()
      if (!supabaseUser?.id) {
        const fallback = normalizeUserProfile({}, auth.user)
        profile.value = fallback
        syncMeta.value = {
          connected: false,
          source: 'local',
          lastSyncedAt: fallback.updatedAt || null,
          accountLabel: auth.user?.email || auth.user?.account || auth.user?.name || 'Current user'
        }
        return fallback
      }

      const row = await ensureUserProfileRow(auth, supabaseUser)
      const normalized = normalizeUserProfile(row, auth.user)
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
      error.value = formatSupabaseError(err, 'Unable to load profile.')
      const fallback = normalizeUserProfile({}, auth.user)
      profile.value = fallback
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

    try {
      const supabaseUser = await getSupabaseUser()
      if (!supabaseUser?.id) {
        syncMeta.value = {
          connected: false,
          source: 'local',
          lastSyncedAt: normalized.updatedAt || null,
          accountLabel: auth.user?.email || auth.user?.account || auth.user?.name || 'Current user'
        }
        return {
          profile: normalized,
          cloudSaved: false
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
        cloudSaved: true
      }
    } catch (err) {
      error.value = formatSupabaseError(err, 'Unable to save profile.')
      syncMeta.value = {
        connected: false,
        source: 'local',
        lastSyncedAt: normalized.updatedAt || null,
        accountLabel: auth.user?.email || auth.user?.account || auth.user?.name || 'Current user'
      }
      return {
        profile: normalized,
        cloudSaved: false
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
