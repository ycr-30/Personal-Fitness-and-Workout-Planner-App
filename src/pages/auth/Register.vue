<template>
  <div class="auth-page">
    <div class="auth-container">
      <section class="auth-card">
        <header class="card-header">
          <h2>Create your account</h2>
          <p>Share a few essentials so we can tailor the experience instantly.</p>
        </header>

        <form v-if="step === 'form'" class="form" @submit.prevent="onSubmit">
          <div class="form-grid">
            <div class="field">
              <label for="register-name">Name</label>
              <input
                id="register-name"
                v-model.trim="form.name"
                type="text"
                placeholder="Your name"
                autocomplete="name"
                @blur="touched.name = true"
              />
              <p v-if="touched.name && !form.name" class="helper helper-error">
                Please enter your name.
              </p>
            </div>

            <div class="field">
              <label for="register-account">{{ isSocial ? 'Username' : 'Email address' }}</label>
              <input
                id="register-account"
                v-model.trim="form.account"
                :type="isSocial ? 'text' : 'email'"
                :placeholder="isSocial ? 'yourname' : 'you@example.com'"
                :autocomplete="isSocial ? 'username' : 'email'"
                :disabled="isSocial"
                @blur="touched.account = true"
              />
              <p v-if="touched.account && inlineErrors.account" class="helper helper-error">
                {{ inlineErrors.account }}
              </p>
              <p v-if="isSocial" class="helper">Auto-filled for your Google account.</p>
            </div>

            <div class="field">
              <label for="register-password">Password</label>
              <input
                id="register-password"
                v-model="form.password"
                type="password"
                placeholder="At least 6 characters"
                autocomplete="new-password"
                :disabled="isSocial"
                @blur="touched.password = true"
              />
              <p v-if="!isSocial && touched.password && inlineErrors.password" class="helper helper-error">
                {{ inlineErrors.password }}
              </p>
              <p v-if="isSocial" class="helper">Password not required for Google sign-in.</p>
            </div>

            <div class="field">
              <label for="register-confirm">Confirm password</label>
              <input
                id="register-confirm"
                v-model="form.confirm"
                type="password"
                placeholder="Re-enter password"
                autocomplete="new-password"
                :disabled="isSocial"
                @blur="touched.confirm = true"
              />
              <p v-if="!isSocial && touched.confirm && inlineErrors.confirm" class="helper helper-error">
                {{ inlineErrors.confirm }}
              </p>
            </div>

            <div class="field">
              <label>Biological sex</label>
              <div class="segmented">
                <button
                  type="button"
                  :class="['segment', { active: form.sex === 'female' }]"
                  @click="form.sex = 'female'"
                >
                  Female
                </button>
                <button
                  type="button"
                  :class="['segment', { active: form.sex === 'male' }]"
                  @click="form.sex = 'male'"
                >
                  Male
                </button>
              </div>
            </div>

            <div class="field">
              <label for="register-birthday">Date of birth</label>
              <input
                id="register-birthday"
                v-model="form.birthday"
                type="date"
                lang="en-CA"
                autocomplete="bday"
                @blur="touched.birthday = true; form.birthday = normalizeBirthdayValue(form.birthday)"
              />
              <p v-if="touched.birthday && birthdayError" class="helper helper-error">
                {{ birthdayError }}
              </p>
            </div>

            <div class="field">
              <label for="register-height">Height (cm)</label>
              <input
                id="register-height"
                v-model.number="form.height"
                type="number"
                min="120"
                max="230"
                step="0.5"
                placeholder="e.g. 175"
                @blur="touched.height = true"
              />
              <p v-if="touched.height && !form.height" class="helper helper-error">
                Height is required.
              </p>
            </div>

            <div class="field">
              <label for="register-weight">Weight (kg)</label>
              <input
                id="register-weight"
                v-model.number="form.weight"
                type="number"
                min="35"
                max="180"
                step="0.1"
                placeholder="e.g. 70.5"
                @blur="touched.weight = true"
              />
              <p v-if="touched.weight && !form.weight" class="helper helper-error">
                Weight is required.
              </p>
            </div>

            <div class="field field-span-2">
              <label for="register-bodyfat">Estimated body fat (%)</label>
              <input
                id="register-bodyfat"
                :value="bodyFatDisplay"
                type="text"
                readonly
              />
              <p class="helper">
                Calculated automatically from height, weight, age, and sex using the Deurenberg equation.
              </p>
              <p v-if="bodyFatWarning" class="helper helper-warning">
                {{ bodyFatWarning }}
              </p>
              <p class="helper">
                You can add a profile photo later in Personal Profile.
              </p>
            </div>
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button class="submit" :disabled="loading || hasBlockingErrors">
            <span v-if="!loading">Create account</span>
            <span v-else>Creating…</span>
          </button>
        </form>

        <div v-else class="verify-panel">
        <div class="verify-header">
          <h3>Verify your account</h3>
          <p>Enter the verification code for <strong>{{ verification.email }}</strong>.</p>
        </div>
          <p v-if="error" class="error">{{ error }}</p>
          <div class="field">
            <label for="verify-code">Verification code</label>
            <input
              id="verify-code"
              v-model.trim="verification.code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="Enter 6-digit code"
              @blur="verification.touched = true"
            />
            <p v-if="verification.touched && verification.error" class="helper helper-error">
              {{ verification.error }}
            </p>
          </div>
          <div class="verify-meta">
            <span v-if="verification.remaining > 0">
              Resend available in {{ verification.remaining }}s
            </span>
            <span v-else>Didn&apos;t get the code?</span>
            <button
              type="button"
              class="btn-link"
              :disabled="verification.remaining > 0"
              @click="sendVerificationCode"
            >
              Resend code
            </button>
          </div>
          <button class="submit" :disabled="loading" @click="confirmVerification">
            <span v-if="!loading">Confirm & Create</span>
            <span v-else>Creating…</span>
          </button>
          <p v-if="verification.notice" class="helper">{{ verification.notice }}</p>
        </div>

        <footer class="card-footer">
          <p class="disclaimer">
            Fitness AI Planner is not a medical service. Always consult healthcare professionals when making decisions about training or nutrition.
          </p>
          <p class="legal-copy">
            By creating an account, you agree to the
            <RouterLink to="/terms">Terms</RouterLink>,
            acknowledge the <RouterLink to="/privacy">Privacy Policy</RouterLink>,
            and confirm you have read the
            <RouterLink to="/disclaimer">Health &amp; AI Disclaimer</RouterLink>.
          </p>
          <div>
            Already a member?
            <RouterLink to="/login">Sign in</RouterLink>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref, onBeforeUnmount, onMounted, watch } from 'vue' // 引入响应式工具
import { useRouter, useRoute } from 'vue-router' // 引入路由
import { useAuthStore } from '@/stores/auth' // 引入鉴权仓库
import { buildAuthServerUrl } from '@/lib/authServerOrigin'

const router = useRouter() // 获取路由
const route = useRoute()
const auth = useAuthStore() // 获取鉴权仓库
auth.error = null // 清空错误

// 注册表单数据
const form = reactive({
  name: '',
  account: '',
  email: '',
  password: '',
  confirm: '',
  sex: 'female',
  birthday: '',
  height: '',
  weight: ''
})

const touched = reactive({
  name: false,
  account: false,
  password: false,
  confirm: false,
  birthday: false,
  height: false,
  weight: false
})

const step = ref('form')
const pendingPayload = ref(null)
const verification = reactive({
  email: '',
  code: '',
  sentCode: '',
  remaining: 0,
  touched: false,
  error: '',
  notice: ''
})
let verifyTimer = null

const emailPattern = /^\S+@\S+\.\S+$/ // 邮箱模式
const usernamePattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/ // 用户名规则
const isSocial = computed(() => (route.query.prefill || '').toString() === 'google')

function generateUsernameFromEmail(val) {
  if (!val) return ''
  const prefix = val.split('@')[0] || 'user'
  const cleaned = prefix.replace(/[^a-zA-Z0-9]/g, '')
  const suffix = Math.floor(Math.random() * 9000 + 1000)
  return (cleaned || 'user') + suffix
}

function normalizeBirthdayValue(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

// 估算体脂率
const bodyFat = computed(() => {
  if (!form.height || !form.weight || !form.birthday) return null
  const birthday = new Date(form.birthday)
  if (Number.isNaN(birthday.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthday.getFullYear()
  const monthDiff = today.getMonth() - birthday.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) age -= 1
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

const bodyFatDisplay = computed(() => (bodyFat.value != null ? `${bodyFat.value}` : '—'))
const bodyFatWarning = computed(() => {
  if (bodyFat.value == null) return ''
  if (bodyFat.value < 3 || bodyFat.value > 60) {
    return 'This value looks unusual — please double check the numbers.'
  }
  return ''
})

const birthdayError = computed(() => {
  if (!form.birthday) return 'Please select your date of birth.'
  return normalizeBirthdayValue(form.birthday) ? '' : 'Please enter a valid date.'
})

const inlineErrors = computed(() => {
  const map = {
    account: '',
    password: '',
    confirm: ''
  }
  const account = form.account?.trim?.() || ''
  if (!account) {
    map.account = isSocial.value ? 'Please enter a username.' : 'Please enter your email address.'
  } else if (isSocial.value) {
    if (!usernamePattern.test(account)) {
      map.account = 'Please enter a valid username (6+ chars with upper, lower, digits).'
    }
  } else if (!emailPattern.test(account)) {
    map.account = 'Please enter a valid email address.'
  }
  if (!isSocial.value) {
    if (!form.password) {
      map.password = 'Password is required.'
    } else if (form.password.length < 6) {
      map.password = 'Password must be at least 6 characters.'
    }
    if (!form.confirm) {
      map.confirm = 'Please confirm your password.'
    } else if (form.confirm !== form.password) {
      map.confirm = 'Passwords do not match.'
    }
  }
  return map
})

const hasBlockingErrors = computed(() => {
  if (
    !form.name ||
    !form.account ||
    !form.height ||
    !form.weight
  ) {
    return true
  }
  if (!isSocial.value && (!form.password || !form.confirm)) return true
  return (
    !!birthdayError.value ||
    !!inlineErrors.value.account ||
    (!!inlineErrors.value.password && !isSocial.value) ||
    (!!inlineErrors.value.confirm && !isSocial.value)
  )
})

watch(
  () => form.password,
  () => {
    if (form.confirm) touched.confirm = true
  }
)

const loading = computed(() => auth.loading) // 加载状态
const error = computed(() => auth.error) // 全局错误

onBeforeUnmount(() => {
  if (verifyTimer) {
    clearInterval(verifyTimer)
    verifyTimer = null
  }
})

// 如果是社交登录回调，尝试从后端会话读取基础信息进行预填
onMounted(async () => {
  if (!isSocial.value) return
  if (route.query.name) form.name = route.query.name
  if (route.query.email) form.email = route.query.email
  if (!form.account && form.email) form.account = generateUsernameFromEmail(form.email)
  try {
    const res = await fetch(buildAuthServerUrl('/me'), {
      credentials: 'include'
    })
    if (!res.ok) return
    const data = await res.json()
    if (data?.user) {
      form.name = data.user.name || ''
      form.email = data.user.email || ''
      if (!form.account && data.user.email) {
        form.account = generateUsernameFromEmail(data.user.email)
      }
    }
  } catch (err) {
    console.error('Prefill failed', err)
  }
})

watch(
  () => route.query.mode,
  async (mode) => {
    if (String(mode || '') !== 'confirm') return
    const sessionUser = await auth.hydrateFromSupabaseSession()
    if (!sessionUser?.id) return
    pendingPayload.value = null
    await router.replace('/onboarding')
  },
  { immediate: true }
)

async function fetchEmailStatus(email) {
  const res = await fetch(
    buildAuthServerUrl(`/auth/supabase/email-status?email=${encodeURIComponent(email)}`),
    {
      credentials: 'include'
    }
  )

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to check email status.')
  }

  return {
    exists: Boolean(data.exists),
    confirmed: Boolean(data.confirmed)
  }
}

async function onSubmit() {
  touched.name = true
  touched.account = true
  touched.birthday = true
  touched.height = true
  touched.weight = true
  if (!isSocial.value) {
    touched.password = true
    touched.confirm = true
  }
  auth.error = null
  if (hasBlockingErrors.value) {
    auth.error = 'Please review the highlighted fields.'
    return
  }

  const normalizedBirthday = normalizeBirthdayValue(form.birthday)
  if (!normalizedBirthday) {
    auth.error = 'Please review the highlighted fields.'
    return
  }
  form.birthday = normalizedBirthday

  if (isSocial.value) {
    try {
      const res = await fetch(buildAuthServerUrl('/profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          username: form.account,
          email: form.email,
          sex: form.sex,
          birthday: form.birthday,
          heightCm: form.height,
          weightKg: form.weight,
          onboardingAnswers: null
        })
      })
      if (!res.ok) {
        auth.error = 'Failed to save profile.'
        return
      }
      const data = await res.json()
      if (data?.user) {
        auth.user = { ...data.user, onboarding: { completed: false, answers: null } }
      }
      router.push('/onboarding')
    } catch (err) {
      console.error(err)
      auth.error = 'Failed to save profile.'
    }
    return
  }

  const payload = {
    account: form.account,
    email: isSocial.value ? form.email : form.account,
    name: form.name,
    password: form.password,
    confirm: form.confirm,
    sex: form.sex,
    birthday: form.birthday,
    height: form.height,
    weight: form.weight
  }

  let emailStatus
  try {
    emailStatus = await fetchEmailStatus(form.account.trim())
  } catch (err) {
    console.error('Email status lookup failed', err)
    auth.error = err?.message || 'Failed to check email status.'
    return
  }

  if (emailStatus.exists && emailStatus.confirmed) {
    const recovered = await auth.login({
      identifier: form.account,
      password: form.password,
      remember: true
    })
    if (recovered) {
      pendingPayload.value = null
      const target = auth.user?.onboarding?.completed ? '/dashboard' : '/onboarding'
      router.push(target)
      return
    }
    auth.error = 'This email already has an account. Sign in with your password or reset it if needed.'
    return
  }

  pendingPayload.value = payload
  const result =
    emailStatus.exists && !emailStatus.confirmed
      ? await auth.beginLocalRegistration(payload, { resend: true })
      : await auth.beginLocalRegistration(payload)
  if (!result?.ok) return
  if (result.verified) {
    pendingPayload.value = null
    router.push('/onboarding')
    return
  }
  verification.email = result.deliveryTarget || form.email || form.account
  verification.notice = result.notice || 'Verification code sent.'
  verification.code = ''
  verification.error = ''
  verification.touched = false
  verification.remaining = Number(result.resendIn || 60)
  step.value = 'verify'
  startVerifyTimer(verification.remaining)
}

function startVerifyTimer(initialSeconds = 60) {
  if (verifyTimer) {
    clearInterval(verifyTimer)
    verifyTimer = null
  }
  verification.remaining = Math.max(0, Number(initialSeconds) || 60)
  if (!verification.remaining) return
  verifyTimer = setInterval(() => {
    verification.remaining -= 1
    if (verification.remaining <= 0) {
      verification.remaining = 0
      clearInterval(verifyTimer)
      verifyTimer = null
    }
  }, 1000)
}

async function sendVerificationCode() {
  verification.error = ''
  verification.notice = ''
  verification.touched = false
  verification.code = ''
  if (!pendingPayload.value) {
    verification.error = 'Missing registration details. Please start again.'
    return
  }
  const result = await auth.beginLocalRegistration(pendingPayload.value, { resend: true })
  if (!result?.ok) {
    verification.error = auth.error || 'Failed to resend verification code.'
    return
  }
  verification.email = result.deliveryTarget || verification.email
  verification.notice = result.notice || 'Verification code resent.'
  verification.remaining = Number(result.resendIn || 60)
  startVerifyTimer(verification.remaining)
}

async function confirmVerification() {
  verification.touched = true
  verification.error = ''
  verification.notice = ''
  auth.error = null
  if (!verification.code) {
    verification.error = 'Please enter the verification code.'
    return
  }
  if (!pendingPayload.value) {
    verification.error = 'Missing registration details. Please start again.'
    return
  }
  const ok = await auth.confirmLocalRegistration({
    account: pendingPayload.value.account,
    code: verification.code,
    profile: pendingPayload.value
  })
  if (!ok) {
    verification.error = auth.error || 'Failed to complete registration.'
    return
  }
  pendingPayload.value = null
  router.push('/onboarding')
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: #f5f5f7;
  color: #1d1d1f;
  display: grid;
  place-items: center;
  padding: 56px 24px;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.auth-container {
  width: min(880px, 100%);
  display: block;
  padding: 44px 48px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(20px);
  border-radius: 30px;
  border: 1px solid rgba(210, 210, 215, 0.45);
  box-shadow:
    0 28px 56px rgba(17, 17, 17, 0.075),
    inset 0 1px rgba(255, 255, 255, 0.35),
    inset 0 -1px rgba(17, 17, 17, 0.08);
}

.auth-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.card-header p {
  margin: 6px 0 0;
  color: #6e6e73;
  font-size: 15px;
}

.form {
  display: grid;
  gap: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.field {
  display: grid;
  align-content: start;
  gap: 5px;
  min-height: 92px;
}

.field-span-2 {
  grid-column: 1 / -1;
}

.field label {
  font-size: 13px;
  letter-spacing: 0.03em;
  color: #6e6e73;
}

.field input {
  border: 1px solid rgba(210, 210, 215, 0.8);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 15px;
  background: rgba(255, 255, 255, 0.8);
  color: #1d1d1f;
  -webkit-text-fill-color: #1d1d1f;
  caret-color: #1d1d1f;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input::placeholder {
  color: #8e8e93;
  -webkit-text-fill-color: #8e8e93;
}

.field input:focus {
  border-color: #0071e3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.15);
  outline: none;
}

.field input:disabled,
.field input:read-only {
  color: #1d1d1f;
  -webkit-text-fill-color: #1d1d1f;
  opacity: 1;
}

.field input:disabled {
  background: rgba(168, 178, 198, 0.32);
}

.field input:-webkit-autofill,
.field input:-webkit-autofill:hover,
.field input:-webkit-autofill:focus,
.field input:-webkit-autofill:active {
  -webkit-text-fill-color: #1d1d1f;
  caret-color: #1d1d1f;
  transition: background-color 9999s ease-out 0s;
  -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.96) inset;
  box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.96) inset;
}

.helper {
  margin: 0;
  font-size: 12px;
  color: #6e6e73;
  min-height: 18px;
  line-height: 1.45;
}

.helper-error {
  color: #d70015;
}

.helper-warning {
  color: #c47f00;
}

.segmented {
  display: inline-flex;
  padding: 5px;
  border-radius: 999px;
  background: rgba(210, 210, 215, 0.25);
  gap: 5px;
}

.segment {
  border: none;
  border-radius: 999px;
  padding: 7px 16px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #6e6e73;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.segment.active {
  background: #111;
  color: #f5f5f7;
}

.error {
  margin: -4px 0 0;
  font-size: 13px;
  color: #d70015;
}

.submit {
  border: none;
  border-radius: 16px;
  padding: 13px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(145deg, #111, #2d2d2f);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(17, 17, 17, 0.15);
}

.submit:disabled {
  opacity: 0.45;
  cursor: default;
  box-shadow: none;
}

.verify-panel {
  display: grid;
  gap: 18px;
}

.verify-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.verify-header p {
  margin: 8px 0 0;
  color: #6e6e73;
  font-size: 15px;
}

.verify-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #6e6e73;
}

.btn-link {
  border: none;
  background: transparent;
  color: #0071e3;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.btn-link:disabled {
  color: #b0b0b5;
  cursor: not-allowed;
}

.card-footer {
  font-size: 14px;
  color: #6e6e73;
  display: grid;
  gap: 12px;
}

.card-footer a {
  color: #0071e3;
  text-decoration: none;
  font-weight: 500;
}

.card-footer a:hover {
  text-decoration: underline;
}

.disclaimer {
  margin: 0;
  font-size: 12px;
  color: #8e8e93;
  line-height: 1.5;
}

.legal-copy {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: #6e6e73;
}

@media (max-width: 960px) {
  .auth-container {
    width: min(760px, 100%);
    padding: 36px 28px;
  }
}

@media (max-width: 640px) {
  .auth-page {
    padding: 40px 20px;
  }

  .auth-container {
    padding: 32px 24px;
    border-radius: 28px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: auto;
  }

  .field {
    min-height: auto;
  }
}
</style>
