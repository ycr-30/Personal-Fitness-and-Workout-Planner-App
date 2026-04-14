<template>
  <div class="auth-page">
    <div class="auth-container">
      <section class="info-panel">
        <RouterLink class="brand" to="/">
          <img class="info-logo" src="/photo/logo.png" alt="Keep Fit" />
        </RouterLink>
        <h1 class="headline">Welcome back.</h1>
        <p class="description">
          Master every training block with a calm, focused dashboard built for momentum.
        </p>
        <ul class="highlights">
          <li>Adaptive scheduling that keeps pace with your routine</li>
          <li>Precision analytics to surface what matters most</li>
          <li>Designed for clarity so you can stay in the flow</li>
        </ul>
      </section>

      <section class="auth-card">
        <header class="card-header">
          <h2>Sign in</h2>
          <p>Use your email and password to enter your control center.</p>
        </header>

        <form class="form" @submit.prevent="onSubmit">
          <div class="field">
            <label for="login-identifier">Email address</label>
            <input
              id="login-identifier"
              v-model.trim="form.account"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              @blur="touched.account = true"
            />
            <p v-if="touched.account && inlineErrors.account" class="helper helper-error">
              {{ inlineErrors.account }}
            </p>
          </div>

          <div class="field">
            <label for="login-password">Password</label>
            <input
              id="login-password"
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              @blur="touched.password = true"
            />
            <p v-if="touched.password && inlineErrors.password" class="helper helper-error">
              {{ inlineErrors.password }}
            </p>
          </div>

          <div class="form-meta">
            <label class="remember">
              <input type="checkbox" v-model="form.remember" />
              <span>Remember me</span>
            </label>
            <button type="button" class="forgot-link" @click="openPasswordReset">
              Forgot password?
            </button>
          </div>

          <transition name="fade">
            <p v-if="error" class="error">{{ error }}</p>
          </transition>
          <transition name="fade">
            <p v-if="resetHint" class="helper">
              Too many attempts? Consider resetting your password.
            </p>
          </transition>

          <button class="submit" :disabled="loading || hasInlineErrors">
            <span v-if="!loading && !welcomeOverlay">Log in</span>
            <span v-else-if="loading">Signing in…</span>
            <span v-else>Loading your plan…</span>
          </button>
        </form>

        <div class="social-section">
          <div class="divider"><span>or continue with</span></div>
          <div class="social-buttons">
            <button type="button" class="social-btn google" @click="startGoogle">
              <span class="social-btn-content">
                <span class="logo google-logo" aria-hidden="true">
                  <svg viewBox="0 0 48 48" role="img">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.08 30.47 0 24 0 14.62 0 6.51 5.38 2.55 13.22l7.96 6.18C12.55 12.83 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.58-.14-3.1-.41-4.56H24v8.64h12.65c-.55 2.96-2.22 5.47-4.73 7.16l7.65 5.93C43.76 37.54 46.5 31.5 46.5 24.5z" />
                    <path fill="#FBBC05" d="M10.51 28.04A14.46 14.46 0 0 1 9.75 24c0-1.41.24-2.78.67-4.04l-7.96-6.18A23.93 23.93 0 0 0 0 24c0 3.92.94 7.63 2.55 10.9l7.96-6.18z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.89-5.81l-7.65-5.93c-2.13 1.44-4.86 2.29-8.24 2.29-6.26 0-11.45-3.33-13.49-8.04l-7.96 6.18C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </span>
                <span>Continue with Google</span>
              </span>
            </button>
          </div>
          <p v-if="socialError" class="helper helper-error">
            {{ socialError }}
          </p>
          <button type="button" class="email-otp-trigger" @click="toggleEmailOtp">
            Sign in with email code
          </button>
        </div>

        <transition name="overlay">
          <div v-if="showEmailOtp" class="email-otp-overlay" @click.self="closeEmailOtp">
            <div class="email-otp-modal">
              <button type="button" class="email-otp-close" @click="closeEmailOtp">×</button>
              <div class="email-otp-header">
                <h3>Sign in with email</h3>
                <p>We’ll send a verification code to your email.</p>
              </div>
              <div class="field">
                <label for="otp-email">Email</label>
                <input
                  id="otp-email"
                  v-model.trim="otp.email"
                  type="email"
                  placeholder="you@example.com"
                  @blur="otp.touched = true"
                />
                <p v-if="otp.touched && otpError" class="helper helper-error">
                  {{ otpError }}
                </p>
              </div>
              <div class="email-otp-row">
                <button
                  type="button"
                  class="email-otp-send"
                  :disabled="otp.loading || !otp.email"
                  @click="sendOtpCode"
                >
                  {{ otp.sent ? 'Resend code' : 'Send code' }}
                </button>
                <span v-if="otp.remaining > 0" class="email-otp-timer">
                  {{ otp.remaining }}s
                </span>
              </div>
              <div class="field">
                <label for="otp-code">Verification code</label>
                <input
                  id="otp-code"
                  v-model.trim="otp.code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="Enter 6-digit code"
                  @blur="otp.touched = true"
                />
                <p v-if="otp.error" class="helper helper-error">
                  {{ otp.error }}
                </p>
              </div>
              <button
                type="button"
                class="submit email-otp-submit"
                :disabled="otp.loading"
                @click="confirmOtp"
              >
                <span v-if="!otp.loading">Continue</span>
                <span v-else>Verifying…</span>
              </button>
              <p v-if="otp.notice" class="helper">{{ otp.notice }}</p>
            </div>
          </div>
        </transition>

        <transition name="overlay">
          <div v-if="showPasswordReset" class="email-otp-overlay" @click.self="closePasswordReset">
            <div class="email-otp-modal password-reset-modal">
              <button type="button" class="email-otp-close" @click="closePasswordReset">×</button>
              <div class="email-otp-header">
                <h3>Reset password</h3>
                <p v-if="passwordReset.step !== 'success'">We’ll send a password reset link to your email.</p>
                <p v-if="passwordReset.step !== 'success'" class="helper reset-scope-note">
                  Only available for password-based accounts. Google sign-in and email-code sign-in do not use passwords.
                </p>
              </div>

              <template v-if="passwordReset.step === 'email'">
                <div class="field">
                  <label for="reset-email">Email address</label>
                  <input
                    id="reset-email"
                    v-model.trim="passwordReset.email"
                    type="email"
                    placeholder="you@example.com"
                    @blur="passwordReset.touchedEmail = true"
                  />
                  <p v-if="passwordReset.touchedEmail && passwordResetEmailError" class="helper helper-error">
                    {{ passwordResetEmailError }}
                  </p>
                </div>
                <button
                  type="button"
                  class="submit email-otp-submit"
                  :disabled="loading || !!passwordResetEmailError"
                  @click="sendPasswordResetCode"
                >
                  <span v-if="!loading">Send reset link</span>
                  <span v-else>Sending…</span>
                </button>
                <p v-if="passwordReset.notice" class="helper">{{ passwordReset.notice }}</p>
                <p v-if="passwordReset.error" class="helper helper-error">{{ passwordReset.error }}</p>
                <button type="button" class="btn-link modal-back-link" @click="closePasswordReset">
                  Back to sign in
                </button>
              </template>

              <template v-else-if="passwordReset.step === 'sent'">
                <p class="helper">
                  Open the password reset email sent to <strong>{{ passwordReset.email }}</strong> and use the reset link to return here.
                </p>
                <div class="email-otp-row">
                  <span class="email-otp-timer">
                    <template v-if="passwordReset.remaining > 0">Resend link in {{ passwordReset.remaining }}s</template>
                    <template v-else>Didn't get the email?</template>
                  </span>
                  <button
                    type="button"
                    class="btn-link"
                    :disabled="loading || passwordReset.remaining > 0"
                    @click="sendPasswordResetCode"
                  >
                    Resend link
                  </button>
                </div>
                <p v-if="passwordReset.notice" class="helper">{{ passwordReset.notice }}</p>
                <p v-if="passwordReset.error" class="helper helper-error">{{ passwordReset.error }}</p>
                <button type="button" class="btn-link modal-back-link" @click="goBackToPasswordResetEmail">
                  Back
                </button>
              </template>

              <template v-else-if="passwordReset.step === 'password'">
                <div class="field">
                  <label for="reset-new-password">New password</label>
                  <input
                    id="reset-new-password"
                    v-model="passwordReset.newPassword"
                    type="password"
                    placeholder="At least 6 characters"
                    autocomplete="new-password"
                    @blur="passwordReset.touchedPassword = true"
                  />
                </div>
                <div class="field">
                  <label for="reset-confirm-password">Confirm password</label>
                  <input
                    id="reset-confirm-password"
                    v-model="passwordReset.confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    autocomplete="new-password"
                    @blur="passwordReset.touchedConfirm = true"
                  />
                  <p
                    v-if="(passwordReset.touchedPassword || passwordReset.touchedConfirm) && passwordResetPasswordError"
                    class="helper helper-error"
                  >
                    {{ passwordResetPasswordError }}
                  </p>
                </div>
                <button
                  type="button"
                  class="submit email-otp-submit"
                  :disabled="loading || !!passwordResetPasswordError"
                  @click="confirmPasswordReset"
                >
                  <span v-if="!loading">Reset password</span>
                  <span v-else>Updating…</span>
                </button>
                <p v-if="passwordReset.notice" class="helper">{{ passwordReset.notice }}</p>
                <p v-if="passwordReset.error" class="helper helper-error">{{ passwordReset.error }}</p>
              </template>

              <template v-else>
                <p class="success-copy">Password updated. You can now sign in with your new password.</p>
                <button type="button" class="submit email-otp-submit" @click="closePasswordReset">
                  Back to sign in
                </button>
              </template>
            </div>
          </div>
        </transition>

        <footer class="card-footer">
          <p class="disclaimer">
            Fitness AI Planner is not a medical service. Consult a healthcare professional before beginning any new program.
          </p>
          <p class="legal-copy">
            By signing in or continuing, you agree to the
            <RouterLink to="/terms">Terms</RouterLink>,
            acknowledge the <RouterLink to="/privacy">Privacy Policy</RouterLink>,
            and confirm you have read the
            <RouterLink to="/disclaimer">Health &amp; AI Disclaimer</RouterLink>.
          </p>
          <div>
            New to Fitness AI Planner?
            <RouterLink to="/register">Create an account</RouterLink>
          </div>
        </footer>
      </section>
    </div>

    <transition name="overlay">
      <div v-if="welcomeOverlay" class="welcome-overlay">
        <div class="welcome-card">
          <p class="welcome-title">Welcome back, {{ displayName }}.</p>
          <p class="welcome-subtitle">Loading your plan…</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { reactive, computed, watch, ref, onBeforeUnmount } from 'vue' // 引入响应式工具
import { useRouter, useRoute } from 'vue-router' // 引入路由实例
import { useAuthStore } from '@/stores/auth' // 引入鉴权仓库
import { supabase } from '@/lib/supabaseClient'
import { getStableDeviceId, saveCloudClientState } from '@/lib/cloudClientState'

const router = useRouter() // 获取路由实例
const route = useRoute() // 获取当前路由
const auth = useAuthStore() // 获取鉴权仓库
auth.error = null // 清空错误提示

// 登录表单数据与记住偏好
const form = reactive({
  account: '',
  password: '',
  remember: true
})

const loading = computed(() => auth.loading) // 登录中的状态
const error = computed(() => auth.error) // 全局错误提示
const touched = reactive({
  account: false,
  password: false
})
const attempts = ref(0) // 连续失败次数
const resetHint = ref(false) // 是否提示重置密码
const welcomeOverlay = ref(false) // 欢迎遮罩层状态

const REMEMBER_KEY = 'pf_remember_pref' // 记住登录偏好键
const LAST_IDENTIFIER_KEY = 'pf_last_identifier' // 最近使用账号键
const storedPref = localStorage.getItem(REMEMBER_KEY)
if (storedPref != null) form.remember = storedPref === 'true'
const lastIdentifier = localStorage.getItem(LAST_IDENTIFIER_KEY)
if (lastIdentifier) form.account = lastIdentifier

watch(
  () => form.remember,
  (val) => {
    localStorage.setItem(REMEMBER_KEY, String(val))
    if (!val) localStorage.removeItem(LAST_IDENTIFIER_KEY)
  }
)

watch(
  () => form.account,
  (val) => {
    if (form.remember) {
      localStorage.setItem(LAST_IDENTIFIER_KEY, val)
    }
  }
)

const emailPattern = /^\S+@\S+\.\S+$/ // 邮箱格式
const inlineErrors = computed(() => {
  const messages = {
    account: '',
    password: ''
  }
  const identifier = form.account?.trim?.() || ''
  if (!identifier) {
    messages.account = 'Please enter your email address.'
  } else if (!emailPattern.test(identifier)) {
    messages.account = 'Please enter a valid email address.'
  }
  if (!form.password) {
    messages.password = 'Please enter your password.'
  }
  return messages
})

const hasInlineErrors = computed(() => {
  return !!inlineErrors.value.account || !!inlineErrors.value.password
})

const displayName = computed(() => auth.user?.name || 'Athlete') // 欢迎语显示名称

// 社交登录跳转
const socialError = ref('')
const AUTH_SERVER_ORIGIN = import.meta.env.VITE_AUTH_SERVER_ORIGIN || 'http://localhost:4000' // 鉴权服务地址
const redirectPath = computed(() => {
  const raw = route.query.redirect
  if (typeof raw !== 'string') return ''
  if (!raw.startsWith('/')) return ''
  return raw
})

async function startGoogle() {
  socialError.value = ''
  if (!AUTH_SERVER_ORIGIN) {
    socialError.value = 'Auth server is not configured. Please set VITE_AUTH_SERVER_ORIGIN.'
    return
  }
  try {
    const healthUrl = new URL('/health', AUTH_SERVER_ORIGIN)
    const healthRes = await fetch(healthUrl, { credentials: 'include' })
    if (!healthRes.ok) {
      socialError.value = 'Auth server is offline. Start it with: cd server && npm run dev'
      return
    }
  } catch (err) {
    socialError.value = 'Auth server is offline. Start it with: cd server && npm run dev'
    return
  }
  const authUrl = new URL('/auth/google', AUTH_SERVER_ORIGIN)
  if (redirectPath.value) authUrl.searchParams.set('redirect', redirectPath.value)
  window.location.href = authUrl.toString()
}

const showEmailOtp = ref(false)
const otp = reactive({
  email: '',
  code: '',
  sent: false,
  remaining: 0,
  touched: false,
  notice: '',
  error: '',
  loading: false
})
let otpTimer = null
const showPasswordReset = ref(false)
const passwordReset = reactive({
  step: 'email',
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
  remaining: 0,
  notice: '',
  error: '',
  touchedEmail: false,
  touchedCode: false,
  touchedPassword: false,
  touchedConfirm: false
})
let passwordResetTimer = null

const otpError = computed(() => {
  if (!otp.email) return 'Please enter your email.'
  const pattern = /^\S+@\S+\.\S+$/
  if (!pattern.test(otp.email)) return 'Please enter a valid email.'
  return ''
})

const passwordResetEmailError = computed(() => {
  const pattern = /^\S+@\S+\.\S+$/
  if (!passwordReset.email) return 'Invalid email address'
  if (!pattern.test(passwordReset.email)) return 'Invalid email address'
  return ''
})

const passwordResetPasswordError = computed(() => {
  if (!passwordReset.newPassword || passwordReset.newPassword.length < 6) {
    return 'Password must meet minimum security requirements'
  }
  if (passwordReset.newPassword !== passwordReset.confirmPassword) {
    return 'Passwords do not match'
  }
  return ''
})

function toggleEmailOtp() {
  if (showPasswordReset.value) closePasswordReset()
  showEmailOtp.value = !showEmailOtp.value
}

function closeEmailOtp() {
  showEmailOtp.value = false
}

onBeforeUnmount(() => {
  if (otpTimer) {
    clearInterval(otpTimer)
    otpTimer = null
  }
  if (passwordResetTimer) {
    clearInterval(passwordResetTimer)
    passwordResetTimer = null
  }
})

function startOtpTimer() {
  if (otpTimer) clearInterval(otpTimer)
  otp.remaining = 60
  otpTimer = setInterval(() => {
    otp.remaining -= 1
    if (otp.remaining <= 0) {
      otp.remaining = 0
      clearInterval(otpTimer)
      otpTimer = null
    }
  }, 1000)
}

function resetPasswordResetState({ keepEmail = false } = {}) {
  const preservedEmail = keepEmail ? passwordReset.email : ''
  passwordReset.step = 'email'
  passwordReset.email = preservedEmail
  passwordReset.code = ''
  passwordReset.newPassword = ''
  passwordReset.confirmPassword = ''
  passwordReset.remaining = 0
  passwordReset.notice = ''
  passwordReset.error = ''
  passwordReset.touchedEmail = false
  passwordReset.touchedCode = false
  passwordReset.touchedPassword = false
  passwordReset.touchedConfirm = false
  stopPasswordResetTimer()
}

function openPasswordReset() {
  closeEmailOtp()
  resetPasswordResetState()
  if (/^\S+@\S+\.\S+$/.test(form.account || '')) {
    passwordReset.email = form.account.trim()
  }
  showPasswordReset.value = true
}

function closePasswordReset() {
  showPasswordReset.value = false
  if (String(route.query.mode || '') === 'recovery') {
    const nextQuery = { ...route.query }
    delete nextQuery.mode
    router.replace({ name: 'login', query: nextQuery })
  }
  resetPasswordResetState()
}

function goBackToPasswordResetEmail() {
  resetPasswordResetState({ keepEmail: true })
}

function startPasswordResetTimer(initialSeconds = 60) {
  stopPasswordResetTimer()
  passwordReset.remaining = Math.max(0, Number(initialSeconds) || 60)
  if (!passwordReset.remaining) return
  passwordResetTimer = setInterval(() => {
    passwordReset.remaining -= 1
    if (passwordReset.remaining <= 0) {
      passwordReset.remaining = 0
      clearInterval(passwordResetTimer)
      passwordResetTimer = null
    }
  }, 1000)
}

function stopPasswordResetTimer() {
  if (passwordResetTimer) {
    clearInterval(passwordResetTimer)
    passwordResetTimer = null
  }
}

async function applyRecoveryMode() {
  if (String(route.query.mode || '') !== 'recovery') return
  closeEmailOtp()
  if (!showPasswordReset.value) {
    showPasswordReset.value = true
  }
  if (passwordReset.step === 'success') return
  if (!supabase) {
    passwordReset.step = 'email'
    passwordReset.notice = ''
    passwordReset.error = 'Supabase auth is not configured.'
    return
  }

  try {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      passwordReset.step = passwordReset.email ? 'sent' : 'email'
      passwordReset.notice = ''
      passwordReset.error = 'Recovery session expired. Request a new password reset link.'
      return
    }

    const recoveryUser = data?.session?.user || null
    if (!recoveryUser?.id) {
      passwordReset.step = passwordReset.email ? 'sent' : 'email'
      passwordReset.notice = passwordReset.email
        ? 'Open the password reset email and use the reset link to continue.'
        : 'Request a password reset link to continue.'
      passwordReset.error = ''
      return
    }

    if (recoveryUser.email && !passwordReset.email) {
      passwordReset.email = recoveryUser.email
    }
    passwordReset.step = 'password'
    passwordReset.notice = 'Recovery verified. Set your new password.'
    passwordReset.error = ''
    stopPasswordResetTimer()
  } catch (error) {
    console.error('applyRecoveryMode failed', error)
    passwordReset.step = passwordReset.email ? 'sent' : 'email'
    passwordReset.notice = ''
    passwordReset.error = 'Recovery session expired. Request a new password reset link.'
  }
}

async function fetchEmailStatus(email) {
  const res = await fetch(
    `${AUTH_SERVER_ORIGIN}/auth/supabase/email-status?email=${encodeURIComponent(email)}`,
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

async function sendPasswordResetCode() {
  passwordReset.touchedEmail = true
  passwordReset.error = ''
  passwordReset.notice = ''
  if (passwordResetEmailError.value) return

  try {
    const status = await fetchEmailStatus(passwordReset.email)
    if (status.exists && !status.confirmed) {
      passwordReset.error = 'This email is registered but not yet verified. Return to sign up and resend the verification email.'
      return
    }
  } catch (err) {
    passwordReset.error = err?.message || 'Failed to check email status.'
    return
  }

  const result = await auth.sendPasswordResetCode(passwordReset.email)
  if (!result?.success) {
    passwordReset.error = auth.error || 'Failed to send password reset link.'
    return
  }
  passwordReset.step = 'sent'
  passwordReset.notice =
    result.notice || result.message || 'If an account exists for this email, a password reset link has been sent.'
  startPasswordResetTimer(Number(result.resendIn || 60))
}

async function confirmPasswordReset() {
  passwordReset.touchedPassword = true
  passwordReset.touchedConfirm = true
  passwordReset.error = ''
  if (passwordResetPasswordError.value) return
  const result = await auth.confirmPasswordReset({
    email: passwordReset.email,
    newPassword: passwordReset.newPassword,
    confirmPassword: passwordReset.confirmPassword
  })
  if (!result?.success) {
    passwordReset.error = auth.error || 'Failed to update password.'
    return
  }
  passwordReset.step = 'success'
  passwordReset.notice = result.message || ''
}

async function sendOtpCode() {
  otp.touched = true
  if (otpError.value) return
  if (!supabase) {
    otp.error = 'Email sign-in is not configured.'
    return
  }
  otp.loading = true
  otp.notice = ''
  otp.error = ''
  otp.code = ''
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: otp.email,
      options: { shouldCreateUser: true }
    })
    if (error) {
      otp.error = error.message || 'Failed to send code.'
      return
    }
    otp.sent = true
    otp.notice = 'Verification code sent.'
    startOtpTimer()
  } finally {
    otp.loading = false
  }
}

watch(
  () => route.query.mode,
  async (mode) => {
    if (String(mode || '') !== 'recovery') return
    await applyRecoveryMode()
  },
  { immediate: true }
)

async function confirmOtp() {
  otp.touched = true
  otp.error = ''
  if (otpError.value) return
  if (!otp.sent) {
    otp.error = 'Please send a code first.'
    return
  }
  if (otp.remaining <= 0) {
    otp.error = 'Code expired. Please resend.'
    return
  }
  if (!supabase) {
    otp.error = 'Email sign-in is not configured.'
    return
  }
  otp.loading = true
  otp.notice = ''
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: otp.email,
      token: otp.code,
      type: 'email'
    })
    if (error) {
      otp.error = error.message || 'Incorrect code.'
      return
    }
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError) {
      otp.notice = userError.message || 'Failed to load user.'
      return
    }
    await auth.setUserFromSupabase(data.user)
    const synced = await auth.syncServerSessionFromSupabase()
    if (!synced) {
      await auth.rollbackSupabaseAuthState(
        'Email verified, but failed to start the app session. Please restart the auth server and try again.'
      )
      otp.error = auth.error || 'Failed to start the app session.'
      return
    }
    await syncLoginPreferencesToCloud(otp.email)
    router.push('/onboarding')
  } finally {
    otp.loading = false
  }
}

async function syncLoginPreferencesToCloud(identifier) {
  try {
    await saveCloudClientState([
      {
        scope: 'device',
        deviceId: getStableDeviceId(),
        stateKey: 'remember_me',
        stateValue: {
          enabled: !!form.remember
        }
      },
      {
        scope: 'device',
        deviceId: getStableDeviceId(),
        stateKey: 'last_identifier',
        stateValue: {
          value: form.remember ? String(identifier || '').trim() : ''
        }
      }
    ])
  } catch (error) {
    console.error('Failed to save login preferences to cloud', error)
  }
}

async function onSubmit() {
  touched.account = true
  touched.password = true
  if (hasInlineErrors.value) return
  try {
    const status = await fetchEmailStatus(form.account.trim())
    if (status.exists && !status.confirmed) {
      auth.error = 'This email is registered but not yet verified. Return to sign up and resend the verification email.'
      return
    }
  } catch (err) {
    auth.error = err?.message || 'Failed to check email status.'
    return
  }
  const ok = await auth.login({
    identifier: form.account,
    password: form.password,
    remember: form.remember
  })
  if (!ok) {
    attempts.value += 1
    if (attempts.value >= 3) resetHint.value = true
    return
  }
  attempts.value = 0
  resetHint.value = false
  await syncLoginPreferencesToCloud(form.account)
  const target =
    auth.user?.onboarding?.completed && redirectPath.value
      ? redirectPath.value
      : auth.user?.onboarding?.completed
        ? '/dashboard'
        : '/onboarding'
  router.replace(target)
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: #f5f5f7;
  color: #1d1d1f;
  display: grid;
  place-items: center;
  padding: 80px 24px;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.auth-container {
  width: min(1040px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 64px;
  padding: 64px 72px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(20px);
  border-radius: 36px;
  border: 1px solid rgba(210, 210, 215, 0.45);
  box-shadow:
    0 40px 80px rgba(17, 17, 17, 0.08),
    inset 0 1px rgba(255, 255, 255, 0.35),
    inset 0 -1px rgba(17, 17, 17, 0.08);
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.brand {
  text-decoration: none;
}

.info-logo {
  width: 560px;
  height: auto;
  display: block;
  object-fit: contain;
  max-width: 100%;
}

.headline {
  margin: 0;
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 600;
}

.description {
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  color: #515154;
}

.highlights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
  color: #3a3a3c;
  font-size: 16px;
}

.highlights li::before {
  content: '•';
  margin-right: 8px;
  color: #0071e3;
}

.auth-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.card-header p {
  margin: 8px 0 0;
  color: #6e6e73;
  font-size: 16px;
}

.form {
  display: grid;
  gap: 18px;
}

.field {
  display: grid;
  gap: 10px;
}

.field label {
  font-size: 14px;
  letter-spacing: 0.03em;
  color: #6e6e73;
}

.field input {
  border: 1px solid rgba(210, 210, 215, 0.8);
  border-radius: 16px;
  padding: 16px 20px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.8);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input:focus {
  border-color: #0071e3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.15);
  outline: none;
}

.remember {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.form-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.remember input {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.forgot-link {
  border: none;
  background: transparent;
  color: #0071e3;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.forgot-link:hover {
  text-decoration: underline;
}

.helper {
  margin: 0;
  font-size: 13px;
  color: #6e6e73;
}

.helper-error {
  color: #d70015;
}

.reset-scope-note {
  margin-top: -4px;
  max-width: 420px;
}

.error {
  margin: -4px 0 0;
  font-size: 14px;
  color: #d70015;
}

.submit {
  border: none;
  border-radius: 18px;
  padding: 14px;
  font-size: 17px;
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

.social-section {
  display: grid;
  gap: 12px;
  justify-items: center;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #6e6e73;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(210, 210, 215, 0.7);
}

.social-buttons {
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: 440px;
  justify-self: center;
}

.social-btn {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 12px;
  background: #fff;
  padding: 14px 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-items: center;
  min-height: 52px;
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.social-btn:hover {
  transform: translateY(-0.5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
}

.social-btn-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.social-btn .logo {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.social-btn .logo svg {
  width: 18px;
  height: 18px;
  display: block;
}

.social-btn-content > span:last-child {
  text-align: center;
}

.social-btn.google .logo {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
}

.social-btn.apple .logo {
  background: #000;
  color: #fff;
}

.social-btn.google {
  background: #4285f4;
  border-color: #2f6adf;
  color: #fff;
  box-shadow: 0 6px 14px rgba(66, 133, 244, 0.35);
}

.social-btn.google:hover {
  background: #3b79e4;
}

.social-btn.apple {
  background: #000;
  border-color: #000;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}

.social-btn.apple:hover {
  background: #111;
}

.card-footer {
  font-size: 15px;
  color: #6e6e73;
  display: grid;
  gap: 16px;
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

.email-otp-trigger {
  width: 100%;
  max-width: 440px;
  border: 1px solid rgba(210, 210, 215, 0.8);
  border-radius: 12px;
  background: #fff;
  padding: 14px 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.email-otp-trigger:hover {
  transform: translateY(-0.5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.email-otp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.4);
  display: grid;
  place-items: center;
  z-index: 70;
  padding: 24px;
}

.email-otp-modal {
  width: min(460px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(17, 17, 17, 0.25);
  display: grid;
  gap: 16px;
  position: relative;
}

.email-otp-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  font-size: 20px;
  cursor: pointer;
}

.email-otp-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.email-otp-header p {
  margin: 6px 0 0;
  color: #6e6e73;
  font-size: 13px;
}

.email-otp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.email-otp-send {
  border: none;
  background: #111;
  color: #fff;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
}

.email-otp-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.email-otp-timer {
  font-size: 12px;
  color: #6e6e73;
}

.email-otp-submit {
  background: linear-gradient(145deg, #111, #2d2d2f);
}

.btn-link {
  border: none;
  background: transparent;
  padding: 0;
  color: #0071e3;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn-link:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.password-reset-modal {
  gap: 18px;
}

.modal-back-link {
  justify-self: start;
  padding: 10px 14px;
  border-radius: 12px;
  background: #f3f4f6;
  color: #111827;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.modal-back-link:hover {
  background: #e8eaee;
}

.success-copy {
  margin: 0;
  color: #3a3a3c;
  font-size: 14px;
  line-height: 1.6;
}

.welcome-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(3px);
  z-index: 60;
}

.welcome-card {
  padding: 32px 36px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 28px;
  box-shadow: 0 30px 60px rgba(17, 17, 17, 0.2);
  text-align: center;
}

.welcome-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.welcome-subtitle {
  margin: 6px 0 0;
  font-size: 15px;
  color: #6e6e73;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.25s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

@media (max-width: 960px) {
  .auth-container {
    grid-template-columns: 1fr;
    gap: 48px;
    padding: 48px 32px;
  }

  .info-panel {
    text-align: center;
    align-items: center;
  }
}

@media (max-width: 640px) {
  .auth-page {
    padding: 40px 20px;
  }

  .form-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .auth-container {
    padding: 32px 24px;
    border-radius: 28px;
  }

  .highlights {
    gap: 8px;
    font-size: 15px;
  }
}
</style>
