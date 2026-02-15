<template>
  <section class="profile-page">
    <header class="profile-header">
      <div>
        <h1>General Profile</h1>
        <p>Update your personal information and contact details.</p>
        <p v-if="saved" class="save-toast">Profile updated successfully.</p>
      </div>
    </header>

    <section class="profile-hero">
      <div class="hero-banner"></div>
      <div class="hero-body">
        <div class="avatar" :style="avatarStyle">
          <span v-if="!avatarStyle.backgroundImage">{{ initials }}</span>
        </div>
        <div>
          <h2>{{ fullName }}</h2>
          <p>{{ form.email || 'alex.morgan@example.com' }}</p>
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
            <h3>Personal Information</h3>
            <p>Manage your contact details.</p>
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
          <div class="field">
            <label>Email Address</label>
            <input v-model="form.email" type="email" disabled />
          </div>
          <div class="field">
            <label>Phone Number</label>
            <input v-model.trim="form.phone" type="tel" placeholder="+1 (555) 000-0000" :disabled="!isEditingPersonal" />
          </div>
        </div>
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

      <section v-if="onboardingSummary" class="card">
        <header class="card-title">
          <div>
            <h3>Onboarding Preferences</h3>
            <p>A quick snapshot from your survey answers.</p>
          </div>
        </header>
        <div class="summary-grid">
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
      </section>
    </form>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const saved = ref(false)
const isEditingPersonal = ref(false)
const isEditingBody = ref(false)
const personalBackup = ref(null)
const bodyBackup = ref(null)

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  sex: 'female',
  birthday: '',
  height: '',
  weight: '',
  avatar: ''
})

const setFormFromUser = (user) => {
  const name = user?.name || ''
  const parts = name.trim().split(' ')
  form.firstName = parts[0] || ''
  form.lastName = parts.slice(1).join(' ')
  form.email = user?.email || ''
  form.phone = user?.phone || ''
  form.sex = user?.sex || 'female'
  form.birthday = user?.birthday || ''
  form.height = user?.height || ''
  form.weight = user?.weight || ''
  form.avatar = user?.avatar || ''
}

watch(
  () => auth.user,
  (user) => {
    if (user) setFormFromUser(user)
  },
  { immediate: true }
)

const fullName = computed(() => {
  const name = `${form.firstName} ${form.lastName}`.trim()
  return name || 'Alex Morgan'
})

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
  const reader = new FileReader()
  reader.onload = () => {
    form.avatar = reader.result
  }
  reader.readAsDataURL(file)
}

function resetForm() {
  if (auth.user) setFormFromUser(auth.user)
}

function startPersonalEdit() {
  personalBackup.value = {
    firstName: form.firstName,
    lastName: form.lastName,
    phone: form.phone
  }
  isEditingPersonal.value = true
}

function cancelPersonalEdit() {
  if (personalBackup.value) {
    form.firstName = personalBackup.value.firstName
    form.lastName = personalBackup.value.lastName
    form.phone = personalBackup.value.phone
  }
  isEditingPersonal.value = false
}

function savePersonal() {
  auth.updateProfile({
    name: fullName.value,
    phone: form.phone
  })
  isEditingPersonal.value = false
  saved.value = true
  setTimeout(() => {
    saved.value = false
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

function saveBody() {
  auth.updateProfile({
    sex: form.sex,
    birthday: form.birthday,
    height: form.height,
    weight: form.weight
  })
  isEditingBody.value = false
  saved.value = true
  setTimeout(() => {
    saved.value = false
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

.hero-body h2 {
  margin: 0 0 4px;
  font-size: 20px;
}

.hero-body p {
  margin: 0;
  color: var(--text-muted);
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
