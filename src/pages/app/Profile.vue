<template>
  <section class="profile-page">
    <header class="profile-header">
      <div>
        <h1>Personal Profile</h1>
        <p>Update the identity and body metrics that shape your plan, analytics, and nutrition guidance.</p>
        <p
          v-if="savedMessage"
          class="save-toast"
          :class="{ error: savedTone === 'error', neutral: savedTone === 'neutral' }"
        >
          {{ savedMessage }}
        </p>
        <p v-else-if="profileError" class="save-toast error">{{ profileError }}</p>
      </div>
    </header>

    <section class="profile-hero">
      <div class="hero-banner"></div>
      <div class="hero-body">
        <div class="avatar" :style="avatarStyle">
          <span v-if="!avatarStyle.backgroundImage">{{ initials }}</span>
        </div>
        <div class="hero-copy">
          <h2>{{ fullName }}</h2>
          <p>Profile details used across coaching, analytics, and planning.</p>
          <div class="hero-account">
            <span class="meta-label">Account email</span>
            <div class="hero-account-row">
              <strong>{{ accountEmailDisplay }}</strong>
              <RouterLink class="manage-link" to="/settings">
                Manage in Settings
              </RouterLink>
            </div>
          </div>
        </div>
        <label class="edit-avatar">
          <input type="file" accept="image/*" @change="onAvatarChange" />
          <span>Edit</span>
        </label>
      </div>
    </section>

    <form class="profile-grid" @submit.prevent>
      <section class="card">
        <header class="card-title">
          <div>
            <h3>Basic Information</h3>
            <p>Name shown across your dashboard, plan, and workout history.</p>
          </div>
          <div class="card-actions">
            <template v-if="isEditingPersonal">
              <button class="btn ghost" type="button" @click="cancelPersonalEdit">Cancel</button>
              <button class="btn primary" type="button" @click="savePersonal">Save Changes</button>
            </template>
            <button v-else class="btn ghost" type="button" @click="startPersonalEdit">Change</button>
          </div>
        </header>
        <div class="form-grid">
          <div class="field">
            <label>First Name</label>
            <input v-model.trim="form.firstName" type="text" placeholder="Alex" :disabled="!isEditingPersonal" />
          </div>
          <div class="field">
            <label>Last Name</label>
            <input v-model.trim="form.lastName" type="text" placeholder="Morgan" :disabled="!isEditingPersonal" />
          </div>
        </div>
        <p class="section-note">
          Account email, sign-in method, password, and delete account controls are managed in
          <RouterLink to="/settings">Settings</RouterLink>.
        </p>
      </section>

      <section class="card">
        <header class="card-title">
          <div>
            <h3>Body Metrics</h3>
            <p>Keep your stats updated for accurate insights.</p>
          </div>
          <div class="card-actions">
            <template v-if="isEditingBody">
              <button class="btn ghost" type="button" @click="cancelBodyEdit">Cancel</button>
              <button class="btn primary" type="button" @click="saveBody">Save Changes</button>
            </template>
            <button v-else class="btn ghost" type="button" @click="startBodyEdit">Change</button>
          </div>
        </header>
        <div class="form-grid">
          <div class="field">
            <label>Biological Sex</label>
            <div class="segmented">
              <button
                type="button"
                :class="['segment', { active: form.sex === 'female' }]"
                :disabled="!isEditingBody"
                @click="setSex('female')"
              >
                Female
              </button>
              <button
                type="button"
                :class="['segment', { active: form.sex === 'male' }]"
                :disabled="!isEditingBody"
                @click="setSex('male')"
              >
                Male
              </button>
            </div>
          </div>
          <div class="field">
            <label>Date of Birth</label>
            <input v-model="form.birthday" type="date" :disabled="!isEditingBody" />
          </div>
          <div class="field">
            <label>Height (cm)</label>
            <input v-model.number="form.height" type="number" min="120" max="230" step="0.5" :disabled="!isEditingBody" />
          </div>
          <div class="field">
            <label>Weight (kg)</label>
            <input v-model.number="form.weight" type="number" min="35" max="180" step="0.1" :disabled="!isEditingBody" />
          </div>
          <div class="field readonly">
            <label>Estimated body fat (%)</label>
            <input :value="bodyFatDisplay" type="text" readonly />
          </div>
        </div>
      </section>

      <section class="card">
        <header class="card-title">
          <div>
            <h3>Onboarding Preferences</h3>
            <p>Review or revise the survey answers that shaped your original starting point.</p>
          </div>
          <div class="card-actions">
            <RouterLink
              class="btn ghost link-button"
              :to="{ name: 'onboarding', query: { edit: '1', returnTo: '/profile' } }"
            >
              {{ onboardingSummary ? 'Edit Onboarding Answers' : 'Complete Onboarding Answers' }}
            </RouterLink>
          </div>
        </header>
        <div v-if="onboardingSummary" class="summary-grid">
          <div class="summary-item">
            <span>Training background</span>
            <strong>{{ onboardingCopy.experience[onboardingSummary.experience] }}</strong>
          </div>
          <div class="summary-item">
            <span>Primary intention</span>
            <strong>{{ onboardingCopy.goal[onboardingSummary.goal] }}</strong>
          </div>
          <div class="summary-item">
            <span>Weekly rhythm</span>
            <strong>{{ onboardingCopy.frequency[onboardingSummary.frequency] }}</strong>
          </div>
          <div class="summary-item">
            <span>Nutrition outlook</span>
            <strong>{{ onboardingCopy.nutrition[onboardingSummary.nutrition] }}</strong>
          </div>
        </div>
        <p v-else class="section-note">
          No onboarding answers are saved yet. Add them if you want to keep a clear record of your original goal,
          training background, and weekly rhythm.
        </p>
        <p class="section-note compact">
          Once you build enough real workout history, plan tuning should rely more on your body metrics and logged
          training data than on this survey snapshot.
        </p>
      </section>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserProfile } from '@/composables/useUserProfile'

const auth = useAuthStore()
const {
  profile,
  error: profileError,
  loadProfile,
  saveProfile
} = useUserProfile()
const savedMessage = ref('')
const savedTone = ref('success')
const isEditingPersonal = ref(false)
const isEditingBody = ref(false)
const personalBackup = ref(null)
const bodyBackup = ref(null)

const form = reactive({
  firstName: '',
  lastName: '',
  sex: 'female',
  birthday: '',
  height: '',
  weight: '',
  avatar: ''
})

function normalizeBirthdayValue(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

function normalizeNumberValue(value) {
  if (value === null || value === undefined || value === '') return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : ''
}

const setFormFromSource = (source = {}) => {
  const name = source?.displayName || source?.name || ''
  const parts = name.trim().split(' ')
  form.firstName = source?.firstName ?? parts[0] ?? ''
  form.lastName = source?.lastName ?? parts.slice(1).join(' ')
  form.sex = source?.sex || 'female'
  form.birthday = normalizeBirthdayValue(source?.birthday)
  form.height = normalizeNumberValue(source?.height)
  form.weight = normalizeNumberValue(source?.weight)
  form.avatar = source?.avatar || ''
}

watch(
  () => auth.user,
  (user) => {
    if (!user || isEditingPersonal.value || isEditingBody.value) return
    setFormFromSource({
      name: user.name,
      sex: user.sex,
      birthday: user.birthday,
      height: user.heightCm || user.height || '',
      weight: user.weightKg || user.weight || '',
      avatar: user.avatar
    })
  },
  { immediate: true }
)

watch(
  profile,
  (value) => {
    if (!value || isEditingPersonal.value || isEditingBody.value) return
    setFormFromSource(value)
  },
  { immediate: true, deep: true }
)

const fullName = computed(() => {
  const name = `${form.firstName} ${form.lastName}`.trim()
  return name || auth.user?.name || 'Athlete'
})

const accountEmailDisplay = computed(() => auth.user?.email || 'No linked account email')

const initials = computed(() => {
  const parts = fullName.value.split(' ')
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')
})

const avatarStyle = computed(() =>
  form.avatar
    ? {
        backgroundImage: `url('${form.avatar}')`
      }
    : {}
)

const bodyFat = computed(() => {
  if (!form.height || !form.weight || !form.birthday) return null
  const birthDate = new Date(form.birthday)
  if (Number.isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1
  if (age < 0) return null
  const heightMeter = Number(form.height) / 100
  if (!heightMeter) return null
  const bmi = Number(form.weight) / (heightMeter * heightMeter)
  if (!Number.isFinite(bmi)) return null
  const sexFlag = form.sex === 'male' ? 1 : 0
  const result = 1.2 * bmi + 0.23 * age - 10.8 * sexFlag - 5.4
  if (!Number.isFinite(result)) return null
  return Number(result.toFixed(1))
})

const bodyFatDisplay = computed(() => (bodyFat.value != null ? `${bodyFat.value}` : '--'))

function onAvatarChange(event) {
  const [file] = event.target.files || []
  if (!file) return
  if (!file.type.startsWith('image/')) return
  if (file.size > 2 * 1024 * 1024) return
  if (!isEditingPersonal.value) {
    personalBackup.value = {
      firstName: form.firstName,
      lastName: form.lastName,
      avatar: form.avatar
    }
    isEditingPersonal.value = true
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.avatar = reader.result
  }
  reader.readAsDataURL(file)
}

function startPersonalEdit() {
  personalBackup.value = {
    firstName: form.firstName,
    lastName: form.lastName,
    avatar: form.avatar
  }
  isEditingPersonal.value = true
}

function cancelPersonalEdit() {
  if (personalBackup.value) {
    form.firstName = personalBackup.value.firstName
    form.lastName = personalBackup.value.lastName
    form.avatar = personalBackup.value.avatar
  }
  isEditingPersonal.value = false
}

async function savePersonal() {
  const result = await saveProfile({
    ...profile.value,
    firstName: form.firstName,
    lastName: form.lastName,
    displayName: fullName.value,
    avatar: form.avatar,
    sex: form.sex,
    birthday: form.birthday,
    height: form.height,
    weight: form.weight
  })
  isEditingPersonal.value = false
  profileError.value = ''
  savedTone.value = result?.cloudSaved === false ? 'neutral' : 'success'
  savedMessage.value = result?.cloudSaved === false
    ? 'Profile updated on this device. Sign in with Supabase to sync it to cloud storage.'
    : 'Profile updated successfully.'
  setTimeout(() => {
    savedMessage.value = ''
  }, 2200)
}

function startBodyEdit() {
  bodyBackup.value = {
    sex: form.sex,
    birthday: form.birthday,
    height: form.height,
    weight: form.weight
  }
  isEditingBody.value = true
}

function cancelBodyEdit() {
  if (bodyBackup.value) {
    form.sex = bodyBackup.value.sex
    form.birthday = bodyBackup.value.birthday
    form.height = bodyBackup.value.height
    form.weight = bodyBackup.value.weight
  }
  isEditingBody.value = false
}

async function saveBody() {
  const result = await saveProfile({
    ...profile.value,
    firstName: form.firstName,
    lastName: form.lastName,
    displayName: fullName.value,
    avatar: form.avatar,
    sex: form.sex,
    birthday: form.birthday,
    height: form.height,
    weight: form.weight
  })
  isEditingBody.value = false
  profileError.value = ''
  savedTone.value = result?.cloudSaved === false ? 'neutral' : 'success'
  savedMessage.value = result?.cloudSaved === false
    ? 'Profile updated on this device. Sign in with Supabase to sync it to cloud storage.'
    : 'Profile updated successfully.'
  setTimeout(() => {
    savedMessage.value = ''
  }, 2200)
}

function setSex(value) {
  if (!isEditingBody.value) return
  form.sex = value
}

const onboardingSummary = computed(() => auth.user?.onboarding?.answers || null)

const onboardingCopy = {
  experience: {
    foundation: 'Foundation phase',
    intermediate: 'Training consistently',
    advanced: 'Performance focused'
  },
  goal: {
    'fat-loss': 'Lean and athletic',
    'muscle-gain': 'Build muscle density',
    performance: 'Raise performance ceiling'
  },
  frequency: {
    '2-sessions': '2 sessions per week',
    '3-4-sessions': '3-4 sessions per week',
    '5-plus-sessions': '5+ sessions per week'
  },
  nutrition: {
    'calorie-deficit': 'Strategic deficit',
    maintenance: 'Maintenance',
    'calorie-surplus': 'Lean surplus'
  }
}

onMounted(() => {
  loadProfile({ force: true })
})
</script>

<style scoped>
.profile-page {
  padding: 36px clamp(20px, 4vw, 48px) 60px;
  display: grid;
  gap: 24px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.profile-header h1 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: clamp(28px, 3.4vw, 36px);
}

.profile-header p {
  margin: 0;
  color: var(--text-muted);
}

.save-toast {
  margin-top: 8px;
  font-size: 13px;
  color: #15803d;
}

.save-toast.neutral {
  color: var(--text-muted);
}

.save-toast.error {
  color: #dc2626;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  border-radius: 14px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-weight: 600;
  box-shadow: var(--shadow-soft);
}

.btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: transparent;
}

.btn.ghost {
  background: var(--surface);
  color: var(--text-primary);
}

.link-button {
  text-decoration: none;
}

.profile-hero {
  background: var(--surface);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  animation: fadeUp 0.6s ease both;
}

.hero-banner {
  height: 120px;
  background: linear-gradient(120deg, #ef4444, #f97316);
}

.hero-body {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 18px 22px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent-soft);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--accent-strong);
  background-size: cover;
  background-position: center;
}

.hero-copy {
  display: grid;
  gap: 10px;
}

.hero-body h2 {
  margin: 0 0 4px;
  font-size: 20px;
}

.hero-body p {
  margin: 0;
  color: var(--text-muted);
}

.hero-account {
  display: grid;
  gap: 6px;
}

.meta-label {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
}

.hero-account-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-account-row strong {
  font-size: 15px;
  line-height: 1.35;
}

.manage-link {
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.edit-avatar {
  position: relative;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
}

.edit-avatar input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.profile-grid {
  display: grid;
  gap: 20px;
}

.card {
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
  padding: 20px;
  box-shadow: var(--shadow-soft);
  animation: fadeUp 0.6s ease 0.08s both;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.card-title h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.card-title p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.form-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.section-note {
  margin: 16px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
}

.section-note.compact {
  margin-top: 10px;
}

.section-note a {
  color: var(--accent);
  font-weight: 700;
  text-decoration: none;
}

.field {
  display: grid;
  gap: 8px;
}

label {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 600;
}

input {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  background: var(--surface);
}

input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.readonly input {
  background: #f3f4f6;
}

.segmented {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  background: var(--surface-soft);
  border-radius: 999px;
}

.segment {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-muted);
  background: transparent;
}

.segment:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.segment.active {
  background: var(--surface-strong);
  color: var(--text-on-strong);
}

.summary-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.summary-item {
  background: var(--surface-soft);
  border-radius: 12px;
  padding: 12px 14px;
  display: grid;
  gap: 6px;
}

.summary-item span {
  font-size: 12px;
  color: var(--text-muted);
}

.summary-item strong {
  font-size: 14px;
}

@media (max-width: 720px) {
  .hero-body {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
