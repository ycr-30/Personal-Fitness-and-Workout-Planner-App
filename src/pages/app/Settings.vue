<template>
  <section class="settings-page">
    <header class="settings-header">
      <div class="header-copy">
        <h1>Settings</h1>
        <p>Manage how Keep Fit behaves across your devices.</p>
        <p v-if="statusMessage" class="status-note" :class="statusTone">{{ statusMessage }}</p>
      </div>
    </header>

    <div class="settings-stack">
      <section class="settings-card">
        <header class="card-header">
          <div>
            <h2>App Preferences</h2>
            <p>Core display preferences that affect the app everywhere.</p>
          </div>
        </header>

        <div class="card-content">
          <div class="pref-row">
            <div class="pref-copy">
              <strong>Unit System</strong>
              <p>Used for measurements and form defaults across the app.</p>
            </div>

            <div class="pref-control">
              <div class="segmented">
                <button
                  type="button"
                  :class="['segment', { active: form.unit_system === 'metric' }]"
                  @click="form.unit_system = 'metric'"
                >
                  Metric
                </button>
                <button
                  type="button"
                  :class="['segment', { active: form.unit_system === 'imperial' }]"
                  @click="form.unit_system = 'imperial'"
                >
                  Imperial
                </button>
              </div>
            </div>
          </div>

          <div class="pref-row">
            <div class="pref-copy">
              <strong>Theme</strong>
              <p>Applies to Dashboard, Analytics, Nutrition, and other pages immediately.</p>
            </div>

            <div class="pref-control">
              <div class="theme-toggle">
                <button
                  type="button"
                  :class="['theme', { active: form.theme === 'light' }]"
                  @click="form.theme = 'light'"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6" fill="none" />
                    <path d="M12 3v3M12 18v3M4.5 4.5l2.2 2.2M17.3 17.3l2.2 2.2M3 12h3M18 12h3M4.5 19.5l2.2-2.2M17.3 6.7l2.2-2.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  :class="['theme', { active: form.theme === 'dark' }]"
                  @click="form.theme = 'dark'"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4a8 8 0 0 0 10.5 10.5z" stroke="currentColor" stroke-width="1.6" fill="none" />
                  </svg>
                </button>
                <button
                  type="button"
                  :class="['theme', { active: form.theme === 'system' }]"
                  @click="form.theme = 'system'"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.6" fill="none" />
                    <path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-card account-security-card">
        <header class="card-header">
          <div>
            <h2>Account & Security</h2>
            <p>Review your sign-in details, change your password, or permanently delete this account.</p>
          </div>
        </header>

        <div class="security-grid">
          <article class="security-panel">
            <span class="panel-label">Account Info</span>
            <strong>Sign-in details</strong>
            <div class="security-field-list">
              <div class="security-field">
                <span>Email</span>
                <strong>{{ accountEmailDisplay }}</strong>
              </div>
              <div class="security-field">
                <span>Login method</span>
                <strong>{{ loginMethodLabel }}</strong>
              </div>
            </div>
            <p v-if="accountInfoError" class="security-note error">{{ accountInfoError }}</p>
            <p v-else-if="accountInfoLoading" class="security-note neutral">Loading account details...</p>
            <p v-else class="security-note neutral">These details are read-only and come from your current authenticated account.</p>
            <p class="security-note neutral">
              Name, avatar, and body metrics are managed in
              <RouterLink class="inline-link" to="/profile">Profile</RouterLink>.
            </p>
          </article>

          <article class="security-panel">
            <span class="panel-label">Password</span>
            <strong>Password management</strong>
            <p class="security-copy">
              {{
                isGoogleManagedAccount
                  ? 'This account is managed by Google sign-in.'
                  : 'Update your password for future email-based sign-ins.'
              }}
            </p>
            <p v-if="passwordState.message" class="security-note" :class="passwordState.tone">
              {{ passwordState.message }}
            </p>
            <button
              v-if="!isGoogleManagedAccount"
              class="btn ghost"
              type="button"
              :disabled="passwordState.loading || !hasSupabaseAccount"
              @click="openPasswordModal"
            >
              {{ passwordState.loading ? 'Updating password...' : 'Change Password' }}
            </button>
          </article>

          <article class="security-panel danger">
            <span class="panel-label">Danger Zone</span>
            <strong>Delete account</strong>
            <p class="security-copy">
              Permanently deletes your authentication account and clears your saved app data from Supabase-backed tables.
            </p>
            <p v-if="deleteState.message" class="security-note" :class="deleteState.tone">
              {{ deleteState.message }}
            </p>
            <button
              class="btn danger"
              type="button"
              :disabled="deleteState.loading || !hasDeleteCapability"
              @click="openDeleteModal"
            >
              {{ deleteState.loading ? 'Deleting account...' : 'Delete Account' }}
            </button>
          </article>
        </div>
      </section>

      <section class="settings-grid">
        <article class="settings-card">
          <header class="card-header">
            <div>
              <h2>Nutrition Defaults</h2>
              <p>These defaults immediately affect Add Food and the water quick actions.</p>
            </div>
          </header>

          <div class="card-content compact">
            <div class="pref-stack">
              <strong>Default Unit in Add Food</strong>
              <div class="segmented">
                <button
                  type="button"
                  :class="['segment', { active: form.nutrition_default_unit === 'g' }]"
                  @click="form.nutrition_default_unit = 'g'"
                >
                  Grams
                </button>
                <button
                  type="button"
                  :class="['segment', { active: form.nutrition_default_unit === 'serving' }]"
                  @click="form.nutrition_default_unit = 'serving'"
                >
                  Serving
                </button>
              </div>
            </div>

            <div class="pref-stack">
              <strong>Food Search Landing View</strong>
              <div class="segmented">
                <button
                  type="button"
                  :class="['segment', { active: form.nutrition_default_search_mode === 'recent' }]"
                  @click="form.nutrition_default_search_mode = 'recent'"
                >
                  Recent
                </button>
                <button
                  type="button"
                  :class="['segment', { active: form.nutrition_default_search_mode === 'all' }]"
                  @click="form.nutrition_default_search_mode = 'all'"
                >
                  All
                </button>
              </div>
            </div>

            <div class="inline-grid">
              <label class="field">
                <span>Quick Add Button A</span>
                <input v-model.number="form.nutrition_water_quick_add_primary_ml" type="number" min="100" step="50" />
              </label>
              <label class="field">
                <span>Quick Add Button B</span>
                <input v-model.number="form.nutrition_water_quick_add_secondary_ml" type="number" min="100" step="50" />
              </label>
            </div>
          </div>
        </article>

        <article class="settings-card">
          <header class="card-header">
            <div>
              <h2>Workout Defaults</h2>
              <p>Used by Workout Log and Schedule when creating a new session.</p>
            </div>
          </header>

          <div class="card-content compact">
            <label class="field">
              <span>Default Location</span>
              <input v-model.trim="form.workout_default_location" type="text" placeholder="Home Gym" />
            </label>

            <div class="inline-grid">
              <label class="field">
                <span>Default Duration (minutes)</span>
                <input v-model.number="form.workout_default_duration_min" type="number" min="5" max="480" step="5" />
              </label>
              <label class="field">
                <span>Default RPE</span>
                <input v-model.number="form.workout_default_rpe" type="number" min="1" max="10" step="1" />
              </label>
            </div>

            <div class="pref-row single-toggle">
              <div class="pref-copy">
                <strong>Auto mark new sessions as completed</strong>
                <p>Applies to newly created workouts in Workout Log and Schedule.</p>
              </div>

              <div class="pref-control">
                <label class="switch" aria-label="Auto mark new workouts as completed">
                  <input v-model="form.workout_auto_mark_completed" type="checkbox" />
                  <span></span>
                </label>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="settings-card">
        <header class="card-header">
          <div>
            <h2>Privacy & Data</h2>
            <p>Per-user cloud storage status, export tools, and local cache controls.</p>
          </div>
        </header>

        <div class="privacy-grid">
          <article class="privacy-panel">
            <span class="panel-label">Cloud Sync</span>
            <strong>{{ syncMeta.connected ? 'Connected' : 'Not connected' }}</strong>
            <p>{{ syncMeta.accountLabel || 'No cloud account detected.' }}</p>
            <small>{{ lastSyncedLabel }}</small>
          </article>

          <article class="privacy-panel">
            <span class="panel-label">Export</span>
            <strong>Download your data</strong>
            <p>Exports settings, nutrition, workouts, plan state, and cloud-backed records.</p>
            <button class="btn ghost small wide" type="button" @click="handleExport">
              Export Data
            </button>
          </article>

          <article class="privacy-panel danger">
            <span class="panel-label">Local Cache</span>
            <strong>Clear this device cache</strong>
            <p>Removes device-only copies, then reloads the app from cloud-backed data.</p>
            <button class="btn danger small wide" type="button" @click="handleClearCache">
              Clear Local Cache
            </button>
          </article>
        </div>
      </section>
    </div>

    <transition name="fade">
      <div v-if="showPasswordModal" class="modal-backdrop" @click.self="closePasswordModal">
        <div class="settings-modal">
          <header class="modal-header">
            <div>
              <h3>Change Password</h3>
              <p>Choose a new password for your email-based sign-in.</p>
            </div>
            <button class="modal-close" type="button" @click="closePasswordModal">×</button>
          </header>

          <div class="modal-body">
            <label class="field">
              <span>New password</span>
              <input v-model="passwordForm.nextPassword" type="password" placeholder="At least 8 characters" />
            </label>

            <label class="field">
              <span>Confirm password</span>
              <input v-model="passwordForm.confirmPassword" type="password" placeholder="Repeat the new password" />
            </label>

            <p v-if="passwordValidationError" class="security-note error">{{ passwordValidationError }}</p>
            <p
              v-else-if="passwordState.message && passwordState.tone === 'error'"
              class="security-note error"
            >
              {{ passwordState.message }}
            </p>
            <p v-else class="security-note neutral">Use at least 8 characters and make sure both fields match.</p>
          </div>

          <footer class="modal-actions">
            <button class="btn ghost" type="button" :disabled="passwordState.loading" @click="closePasswordModal">
              Cancel
            </button>
            <button class="btn primary" type="button" :disabled="passwordState.loading" @click="submitPasswordChange">
              {{ passwordState.loading ? 'Saving...' : 'Save Password' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-backdrop" @click.self="closeDeleteModal">
        <div class="settings-modal danger-modal">
          <header class="modal-header">
            <div>
              <h3>Delete Account</h3>
              <p>This action is permanent. Enter your account email and type <strong>DELETE</strong> to confirm.</p>
            </div>
            <button class="modal-close" type="button" @click="closeDeleteModal">×</button>
          </header>

          <div class="modal-body">
            <label class="field">
              <span>Account email</span>
              <input v-model.trim="deleteForm.email" type="email" placeholder="Enter your current account email" />
            </label>
            <label class="field">
              <span>Confirmation</span>
              <input v-model.trim="deleteForm.confirmation" type="text" placeholder="Type DELETE" />
            </label>
            <p v-if="deleteEmailValidationError" class="security-note error">
              {{ deleteEmailValidationError }}
            </p>
            <p
              v-else-if="deleteState.message && deleteState.tone === 'error'"
              class="security-note error"
            >
              {{ deleteState.message }}
            </p>
            <p v-else class="security-note neutral">
              Your settings, nutrition data, synced workout data, and authentication account will be removed.
            </p>
          </div>

          <footer class="modal-actions">
            <button class="btn ghost" type="button" :disabled="deleteState.loading" @click="closeDeleteModal">
              Cancel
            </button>
            <button class="btn danger" type="button" :disabled="deleteState.loading" @click="submitDeleteAccount">
              {{ deleteState.loading ? 'Deleting...' : 'Delete Account' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserSettings } from '@/composables/useUserSettings'
import { defaultUserSettings, normalizeUserSettings } from '@/lib/userSettings'
import { supabase } from '@/lib/supabaseClient'

const router = useRouter()
const auth = useAuthStore()
const AUTH_SERVER_ORIGIN = import.meta.env.VITE_AUTH_SERVER_ORIGIN || 'http://localhost:4000'
const {
  settings,
  error,
  syncMeta,
  loadSettings,
  saveSettings: saveUserSettings,
  exportUserData,
  clearLocalCache
} = useUserSettings()

const form = reactive({ ...defaultUserSettings })
const statusMessage = ref('')
const statusTone = ref('neutral')
const hydratingForm = ref(true)
const accountInfoLoading = ref(false)
const accountInfoError = ref('')
const currentSupabaseUser = ref(null)
const showPasswordModal = ref(false)
const showDeleteModal = ref(false)
const passwordState = reactive({
  loading: false,
  tone: 'neutral',
  message: ''
})
const deleteState = reactive({
  loading: false,
  tone: 'neutral',
  message: ''
})
const passwordForm = reactive({
  nextPassword: '',
  confirmPassword: ''
})
const deleteForm = reactive({
  email: '',
  confirmation: ''
})
let saveTimer = null
let statusTimer = null

function clearStatusTimer() {
  if (typeof window === 'undefined' || !statusTimer) return
  window.clearTimeout(statusTimer)
  statusTimer = null
}

function queueStatusClear() {
  if (typeof window === 'undefined') return
  clearStatusTimer()
  statusTimer = window.setTimeout(() => {
    statusMessage.value = ''
  }, 1800)
}

function applyThemePreview(theme) {
  if (typeof document === 'undefined') return
  const resolvedTheme =
    theme === 'system'
      ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
  document.documentElement.dataset.theme = resolvedTheme
}

function applySettings(source = {}) {
  Object.assign(form, normalizeUserSettings(source))
}

watch(
  settings,
  (value) => {
    hydratingForm.value = true
    applySettings(value)
    applyThemePreview(normalizeUserSettings(value).theme)
    queueMicrotask(() => {
      hydratingForm.value = false
    })
  },
  { immediate: true, deep: true }
)

const formSnapshot = computed(() => JSON.stringify(normalizeUserSettings(form)))
const savedSnapshot = computed(() => JSON.stringify(normalizeUserSettings(settings.value)))
const accountProvider = computed(() => {
  const provider =
    currentSupabaseUser.value?.app_metadata?.provider ||
    currentSupabaseUser.value?.identities?.[0]?.provider ||
    auth.user?.provider ||
    'email'
  return String(provider || '').toLowerCase()
})
const hasSupabaseAccount = computed(() => Boolean(currentSupabaseUser.value?.id))
const hasDeleteCapability = computed(() =>
  Boolean(currentSupabaseUser.value?.id || auth.user?.id || auth.user?.email)
)
const isGoogleManagedAccount = computed(() => accountProvider.value === 'google')
const loginMethodLabel = computed(() => (isGoogleManagedAccount.value ? 'Google' : 'Email'))
const normalizedAccountEmail = computed(() =>
  String(currentSupabaseUser.value?.email || auth.user?.email || '')
    .trim()
    .toLowerCase()
)
const accountEmailDisplay = computed(
  () => normalizedAccountEmail.value || 'Not available'
)
const passwordValidationError = computed(() => {
  if (!passwordForm.nextPassword && !passwordForm.confirmPassword) return ''
  if (passwordForm.nextPassword.length < 8) return 'Password must be at least 8 characters.'
  if (passwordForm.nextPassword !== passwordForm.confirmPassword) return 'Passwords do not match.'
  return ''
})
const deleteEmailValidationError = computed(() => {
  if (!deleteForm.email) return ''
  if (!normalizedAccountEmail.value) return 'No current account email is available for verification.'
  if (String(deleteForm.email).trim().toLowerCase() !== normalizedAccountEmail.value) {
    return 'Entered email does not match the current account.'
  }
  return ''
})

const lastSyncedLabel = computed(() => {
  if (!syncMeta.value?.lastSyncedAt) return 'Last synced: not available'
  const date = new Date(syncMeta.value.lastSyncedAt)
  if (Number.isNaN(date.getTime())) return 'Last synced: not available'
  return `Last synced: ${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)}`
})

async function persistSettings() {
  try {
    const result = await saveUserSettings(form)
    if (result?.cloudSaved === false) {
      statusMessage.value = 'Applied on this device. Sign in with Supabase to sync settings to cloud storage.'
      statusTone.value = 'neutral'
    } else {
      statusMessage.value = 'Saved successfully.'
      statusTone.value = 'success'
    }
    queueStatusClear()
  } catch {
    statusMessage.value = error.value || 'Unable to save settings.'
    statusTone.value = 'error'
  }
}

function queueAutoSave() {
  if (typeof window === 'undefined') return
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    if (formSnapshot.value === savedSnapshot.value) return
    persistSettings()
  }, 280)
}

watch(
  () => form.theme,
  (theme) => {
    applyThemePreview(theme)
  }
)

watch(
  formSnapshot,
  () => {
    if (hydratingForm.value) return
    if (formSnapshot.value === savedSnapshot.value) return
    queueAutoSave()
  }
)

async function handleExport() {
  await exportUserData()
  statusMessage.value = 'Data export started.'
  statusTone.value = 'success'
}

function resetPasswordState() {
  passwordState.loading = false
  passwordState.tone = 'neutral'
  passwordState.message = ''
}

function resetDeleteState() {
  deleteState.loading = false
  deleteState.tone = 'neutral'
  deleteState.message = ''
}

function openPasswordModal() {
  if (!hasSupabaseAccount.value) {
    passwordState.tone = 'error'
    passwordState.message = 'No active Supabase account session was found for password updates.'
    return
  }
  resetPasswordState()
  passwordForm.nextPassword = ''
  passwordForm.confirmPassword = ''
  showPasswordModal.value = true
}

function closePasswordModal() {
  showPasswordModal.value = false
  passwordForm.nextPassword = ''
  passwordForm.confirmPassword = ''
}

function openDeleteModal() {
  if (!hasDeleteCapability.value) {
    deleteState.tone = 'error'
    deleteState.message = 'No active authenticated account session was found for account deletion.'
    return
  }
  resetDeleteState()
  deleteForm.email = normalizedAccountEmail.value
  deleteForm.confirmation = ''
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteForm.email = ''
  deleteForm.confirmation = ''
}

async function loadAccountInfo() {
  if (!supabase) {
    accountInfoError.value = 'Supabase is not configured in this environment.'
    currentSupabaseUser.value = null
    return
  }
  accountInfoLoading.value = true
  accountInfoError.value = ''
  try {
    const { data, error: requestError } = await supabase.auth.getUser()
    if (requestError) throw requestError
    currentSupabaseUser.value = data.user || null
    if (!data.user && !auth.user?.email && !auth.user?.id) {
      accountInfoError.value = 'No authenticated Supabase account session was found.'
    }
  } catch (err) {
    currentSupabaseUser.value = null
    accountInfoError.value =
      auth.user?.email || auth.user?.id ? '' : err?.message || 'Unable to load account details.'
  } finally {
    accountInfoLoading.value = false
  }
}

async function submitPasswordChange() {
  if (passwordValidationError.value) {
    passwordState.tone = 'error'
    passwordState.message = passwordValidationError.value
    return
  }
  if (!supabase) {
    passwordState.tone = 'error'
    passwordState.message = 'Supabase is not configured in this environment.'
    return
  }

  passwordState.loading = true
  passwordState.message = ''
  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordForm.nextPassword
    })
    if (updateError) throw updateError

    passwordState.tone = 'success'
    passwordState.message = 'Password updated successfully.'
    closePasswordModal()
  } catch (err) {
    passwordState.tone = 'error'
    passwordState.message = err?.message || 'Unable to update password.'
  } finally {
    passwordState.loading = false
  }
}

async function submitDeleteAccount() {
  if (!normalizedAccountEmail.value) {
    deleteState.tone = 'error'
    deleteState.message = 'No current account email is available for deletion verification.'
    return
  }
  if (!deleteForm.email) {
    deleteState.tone = 'error'
    deleteState.message = 'Please enter your current account email to verify deletion.'
    return
  }
  if (deleteEmailValidationError.value) {
    deleteState.tone = 'error'
    deleteState.message = deleteEmailValidationError.value
    return
  }
  if (deleteForm.confirmation !== 'DELETE') {
    deleteState.tone = 'error'
    deleteState.message = 'Please type DELETE to confirm account removal.'
    return
  }

  deleteState.loading = true
  deleteState.message = ''
  try {
    let accessToken = ''
    if (supabase) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      accessToken = sessionData.session?.access_token || ''
    }

    const response = await fetch(`${AUTH_SERVER_ORIGIN}/api/account/delete`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({
        email: String(deleteForm.email).trim().toLowerCase(),
        confirmation: deleteForm.confirmation
      })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to delete account.')
    }

    deleteState.tone = 'success'
    deleteState.message = 'Account deleted successfully.'
    closeDeleteModal()
    if (supabase) {
      await supabase.auth.signOut()
    }
    await auth.logout()
    router.replace({ name: 'login' })
  } catch (err) {
    deleteState.tone = 'error'
    deleteState.message = err?.message || 'Unable to delete account.'
  } finally {
    deleteState.loading = false
  }
}

function handleClearCache() {
  if (typeof window !== 'undefined') {
    const confirmed = window.confirm(
      'Clear local cache for this account on this device? Cloud-backed data will reload after refresh.'
    )
    if (!confirmed) return
  }
  clearLocalCache()
  statusMessage.value = 'Local cache cleared. Reloading from cloud-backed data...'
  statusTone.value = 'neutral'
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      window.location.reload()
    }, 450)
  }
}

onMounted(() => {
  loadSettings({ force: true })
  loadAccountInfo()
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  if (saveTimer) window.clearTimeout(saveTimer)
  clearStatusTimer()
})
</script>

<style scoped>
.settings-page {
  width: min(1240px, 100%);
  margin: 0 auto;
  padding: 36px clamp(20px, 4vw, 40px) 72px;
  display: grid;
  gap: 24px;
  color: var(--text-primary);
  position: relative;
  isolation: isolate;
  min-height: calc(100vh - 24px);
}

.settings-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 36px;
  background: color-mix(in srgb, var(--surface) 8%, transparent);
  pointer-events: none;
}

.settings-stack {
  display: grid;
  gap: 20px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.header-copy {
  display: grid;
  gap: 6px;
}

.settings-header h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(30px, 3.3vw, 42px);
  line-height: 1.05;
}

.settings-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 17px;
}

.status-note {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
}

.status-note.success {
  color: color-mix(in srgb, #16a34a 82%, var(--text-primary));
}

.status-note.error {
  color: color-mix(in srgb, #ef4444 82%, var(--text-primary));
}

.status-note.neutral {
  color: var(--text-muted);
}

.settings-card {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 94%, transparent),
      color-mix(in srgb, var(--surface-muted) 92%, transparent)
    );
  border-radius: 28px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  box-shadow: var(--shadow-soft);
  padding: 28px;
  display: grid;
  gap: 20px;
}

.settings-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.card-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
  line-height: 1.1;
}

.card-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.55;
}

.card-content {
  display: grid;
  gap: 18px;
}

.card-content.compact {
  gap: 16px;
}

.pref-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  align-items: center;
  gap: 20px;
  padding-top: 18px;
  border-top: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
}

.pref-row:first-of-type {
  padding-top: 0;
  border-top: none;
}

.pref-copy {
  display: grid;
  gap: 4px;
}

.pref-copy strong {
  font-size: 17px;
  line-height: 1.2;
}

.pref-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.pref-control {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.pref-stack {
  display: grid;
  gap: 10px;
}

.pref-stack strong {
  font-size: 15px;
}

.segmented {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-muted) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 80%, transparent);
}

.segment {
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  min-width: 92px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  transition: 0.18s ease;
}

.segment.active {
  background: var(--surface-strong);
  color: var(--text-on-strong);
  box-shadow:
    0 10px 18px color-mix(in srgb, var(--shadow-soft) 100%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--surface) 14%, transparent);
}

.theme-toggle {
  display: inline-flex;
  gap: 8px;
}

.theme {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  color: var(--text-muted);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--shadow-soft) 56%, transparent);
  transition: 0.18s ease;
}

.theme.active {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  background: color-mix(in srgb, var(--accent-soft) 38%, var(--surface));
  color: var(--accent);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--accent-soft) 44%, transparent);
}

.theme svg {
  width: 20px;
  height: 20px;
}

.toggle-group {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.switch {
  position: relative;
  width: 54px;
  height: 32px;
  flex: 0 0 auto;
  display: inline-flex;
}

.switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch span {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-track) 88%, var(--border));
  transition: 0.2s ease;
}

.switch span::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--shadow-soft) 60%, transparent);
  transition: 0.2s ease;
}

.switch input:checked + span {
  background: color-mix(in srgb, var(--accent) 88%, transparent);
}

.switch input:checked + span::after {
  transform: translateX(22px);
}

.time-input,
.inline-field select,
.field input,
.field select {
  width: 100%;
  min-height: 46px;
  box-sizing: border-box;
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: color-mix(in srgb, var(--surface-muted) 94%, transparent);
  color: var(--text-primary);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 70%, transparent);
}

.time-input::placeholder,
.field input::placeholder {
  color: color-mix(in srgb, var(--text-muted) 84%, transparent);
}

.time-input:disabled,
.inline-field select:disabled,
.field input:disabled,
.field select:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.inline-field {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface-soft) 94%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
}

.inline-field span {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
}

.inline-field select {
  min-width: 146px;
  padding-block: 10px;
  min-height: 40px;
}

.inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
}

.single-toggle {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.account-security-card {
  gap: 18px;
}

.security-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.security-panel {
  min-height: 240px;
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 22px;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 92%, transparent),
      color-mix(in srgb, var(--surface-muted) 88%, transparent)
    );
  box-shadow: 0 18px 36px color-mix(in srgb, var(--shadow-soft) 46%, transparent);
}

.security-panel.danger {
  border-color: color-mix(in srgb, var(--accent) 26%, var(--border));
}

.security-copy {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.security-field-list {
  display: grid;
  gap: 12px;
  margin-top: 6px;
}

.security-field {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background: color-mix(in srgb, var(--surface-muted) 92%, transparent);
  display: grid;
  gap: 4px;
}

.security-field span {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
}

.security-field strong {
  font-size: 15px;
  line-height: 1.35;
  word-break: break-word;
}

.security-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.security-note.success {
  color: color-mix(in srgb, #16a34a 82%, var(--text-primary));
}

.security-note.error {
  color: color-mix(in srgb, #ef4444 82%, var(--text-primary));
}

.security-note.neutral {
  color: var(--text-muted);
}

.inline-link {
  color: var(--accent);
  font-weight: 700;
  text-decoration: none;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(8px);
}

.settings-modal {
  width: min(520px, 100%);
  border-radius: 26px;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 96%, transparent),
      color-mix(in srgb, var(--surface-muted) 94%, transparent)
    );
  box-shadow: var(--shadow-strong);
  padding: 24px;
  display: grid;
  gap: 18px;
}

.danger-modal {
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.modal-header h3 {
  margin: 0 0 6px;
  font-size: 22px;
  line-height: 1.1;
}

.modal-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.modal-close {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  color: var(--text-muted);
  font-size: 22px;
  line-height: 1;
}

.modal-body {
  display: grid;
  gap: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.privacy-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.privacy-panel {
  min-height: 220px;
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 20px;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface) 92%, transparent),
      color-mix(in srgb, var(--surface-muted) 88%, transparent)
    );
  box-shadow: 0 18px 36px color-mix(in srgb, var(--shadow-soft) 46%, transparent);
}

.privacy-panel.danger {
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
}

.panel-label {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-muted);
}

.privacy-panel strong {
  font-size: 20px;
  line-height: 1.2;
}

.privacy-panel p,
.privacy-panel small {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.55;
}

.privacy-panel .btn {
  margin-top: auto;
}

.btn {
  border-radius: 14px;
  padding: 11px 16px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  color: var(--text-primary);
  font-weight: 700;
  box-shadow: 0 12px 20px color-mix(in srgb, var(--shadow-soft) 44%, transparent);
}

.btn.small {
  padding: 10px 14px;
  font-size: 13px;
}

.btn.primary {
  border-color: transparent;
  background: var(--accent);
  color: var(--text-on-strong);
}

.btn.ghost {
  background: color-mix(in srgb, var(--surface-muted) 92%, transparent);
}

.btn.danger {
  background: color-mix(in srgb, var(--accent-soft) 58%, transparent);
  color: var(--accent-strong);
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
}

.btn.wide {
  width: 100%;
}

@media (max-width: 1180px) {
  .security-grid,
  .settings-grid,
  .privacy-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .settings-page {
    padding-inline: 18px;
  }

  .card-header,
  .pref-row,
  .settings-header {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .pref-row {
    gap: 14px;
  }

  .pref-control,
  .toggle-group {
    justify-content: flex-start;
  }

  .inline-grid {
    grid-template-columns: 1fr;
  }

}

:global(:root[data-theme='dark']) .settings-card {
  background: color-mix(in srgb, var(--surface-muted) 94%, var(--surface));
  box-shadow:
    0 22px 48px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

:global(:root[data-theme='dark']) .settings-page::before {
  background: var(--app-bg);
}

:global(:root[data-theme='dark']) .segmented {
  background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:global(:root[data-theme='dark']) .segment.active {
  box-shadow:
    0 10px 18px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

:global(:root[data-theme='dark']) .theme,
:global(:root[data-theme='dark']) .time-input,
:global(:root[data-theme='dark']) .inline-field select,
:global(:root[data-theme='dark']) .field input,
:global(:root[data-theme='dark']) .field select,
:global(:root[data-theme='dark']) .security-field,
:global(:root[data-theme='dark']) .settings-modal,
:global(:root[data-theme='dark']) .modal-close,
:global(:root[data-theme='dark']) .btn {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 10px 24px rgba(0, 0, 0, 0.22);
}

:global(:root[data-theme='dark']) .security-panel,
:global(:root[data-theme='dark']) .privacy-panel {
  background: color-mix(in srgb, var(--surface-muted) 92%, var(--surface));
}
</style>
