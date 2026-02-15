<template>
  <div class="auth-page">
    <div class="auth-container">
      <section class="info-panel">
        <RouterLink class="brand" to="/">
          <img class="info-logo" src="/photo/logo.png" alt="Keep Fit" />
        </RouterLink>
        <h1 class="headline">Build your personal training universe.</h1>
        <p class="description">
          Craft a profile that helps us personalise programming, recovery advice, and nutrition cues from day one.
        </p>
        <ul class="highlights">
          <li>Evidence-based starting metrics for precise progress</li>
          <li>Human-centred coaching voice with elite-level rigour</li>
          <li>A calm, focused interface built to sustain momentum</li>
        </ul>

        <div class="carousel" role="region" aria-label="Coach spotlight">
          <div class="carousel-track" :style="trackStyle">
            <article v-for="slide in carouselSlides" :key="slide.title" class="carousel-slide">
              <img :src="slide.src" :alt="slide.title" loading="lazy" />
            </article>
          </div>

          <div class="carousel-dots" role="tablist">
            <button
              v-for="(slide, index) in carouselSlides"
              :key="slide.title + index"
              :class="['dot', { active: currentSlide === index }]"
              type="button"
              :aria-label="`Show highlight ${index + 1}`"
              @click="goToSlide(index)"
            />
          </div>
        </div>
      </section>

      <section class="auth-card">
        <header class="card-header">
          <h2>Create your account</h2>
          <p>Share a few essentials so we can tailor the experience instantly.</p>
        </header>

        <form v-if="step === 'form'" class="form" @submit.prevent="onSubmit">
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
            <label for="register-account">Account or email</label>
            <input
              id="register-account"
              v-model.trim="form.account"
              type="text"
              placeholder="yourname or you@example.com"
              autocomplete="username"
              :disabled="isSocial"
              @blur="touched.account = true"
            />
            <p v-if="touched.account && inlineErrors.account" class="helper helper-error">
              {{ inlineErrors.account }}
            </p>
            <p v-if="isSocial" class="helper">Auto-filled from your Google/Apple account (you can edit later).</p>
          </div>

          <div class="field-grid">
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
              <p v-if="isSocial" class="helper">Password not required for Google/Apple sign-in.</p>
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

          <div class="field-grid">
            <div class="field">
              <label for="register-birthday">Date of birth</label>
              <input
                id="register-birthday"
                v-model="form.birthday"
                type="date"
                lang="en"
                @blur="touched.birthday = true"
              />
              <p v-if="touched.birthday && !form.birthday" class="helper helper-error">
                Please select your date of birth.
              </p>
            </div>
            <div class="field avatar-field">
              <label for="register-avatar">Upload avatar</label>
              <div class="avatar-box">
                <div class="avatar-upload" aria-hidden="true">
                  <span class="upload-label">
                    <span class="upload-action">Select file</span>
                    <span class="filename">{{ avatarFileName }}</span>
                  </span>
                </div>
                <label class="avatar-preview">
                  <span class="preview-label">Preview</span>
                  <div class="preview-thumb" :class="{ empty: !avatarPreview }">
                    <img
                      v-if="avatarPreview"
                      :src="avatarPreview"
                      alt="Avatar preview"
                    />
                    <span v-else class="placeholder-icon" aria-hidden="true">+</span>
                  </div>
                  <input
                    id="register-avatar"
                    type="file"
                    accept="image/*"
                    @change="onAvatarChange"
                    hidden
                  />
                </label>
              </div>
            </div>
          </div>

          <div class="field-grid">
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
          </div>

          <div class="field">
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
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button class="submit" :disabled="loading || hasBlockingErrors">
            <span v-if="!loading">Create account</span>
            <span v-else>Creating…</span>
          </button>
        </form>

        <div v-else class="verify-panel">
          <div class="verify-header">
            <h3>Verify your email</h3>
            <p>We’ve sent a verification code to <strong>{{ verification.email }}</strong>.</p>
          </div>
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
              Expires in {{ verification.remaining }}s
            </span>
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

const router = useRouter() // 获取路由
const route = useRoute()
const auth = useAuthStore() // 获取鉴权仓库
const AUTH_SERVER_ORIGIN = import.meta.env.VITE_AUTH_SERVER_ORIGIN || 'http://localhost:4000' // 鉴权服务地址
auth.init() // 初始化会话
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
  weight: '',
  avatarData: '',
  avatarName: ''
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

const avatarPreview = computed(() => form.avatarData || '') // 头像预览

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
const avatarFileName = computed(() => {
  if (!form.avatarData || !form.avatarName) return 'No file chosen'
  return form.avatarName
})

const emailPattern = /^\S+@\S+\.\S+$/ // 邮箱模式
const usernamePattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/ // 用户名规则
const isSocial = computed(() => ['google', 'apple'].includes((route.query.prefill || '').toString()))

function generateUsernameFromEmail(val) {
  if (!val) return ''
  const prefix = val.split('@')[0] || 'user'
  const cleaned = prefix.replace(/[^a-zA-Z0-9]/g, '')
  const suffix = Math.floor(Math.random() * 9000 + 1000)
  return (cleaned || 'user') + suffix
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

const inlineErrors = computed(() => {
  const map = {
    account: '',
    password: '',
    confirm: ''
  }
  const account = form.account?.trim?.() || ''
  if (!account) {
    map.account = 'Please enter your account or email.'
  } else if (!emailPattern.test(account) && !usernamePattern.test(account)) {
    map.account = 'Please enter a valid account (email or 6+ chars with upper, lower, digits).'
  }
  if (isSocial.value && !form.account) {
    map.account = 'Account is required.'
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
    !form.birthday ||
    !form.height ||
    !form.weight
  ) {
    return true
  }
  if (!isSocial.value && (!form.password || !form.confirm)) return true
  return (
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

// 左侧轮播数据
const carouselSlides = [
  {
    title: 'Precision progress check-ins',
    src: 'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Momentum tracking',
    src: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=1200&q=80'
  }
]

const currentSlide = ref(0)
let slideTimer = null

function startCarousel() {
  clearCarousel()
  slideTimer = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % carouselSlides.length
  }, 4600)
}

function clearCarousel() {
  if (slideTimer) {
    clearInterval(slideTimer)
    slideTimer = null
  }
}

function goToSlide(index) {
  currentSlide.value = index
  startCarousel()
}

const trackStyle = computed(() => ({
  transform: `translateX(-${currentSlide.value * 100}%)`
}))

onMounted(startCarousel)
onBeforeUnmount(clearCarousel)
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
    const res = await fetch(`${AUTH_SERVER_ORIGIN}/me`, {
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

// 读取头像文件
async function onAvatarChange(event) {
  const [file] = event.target.files || []
  if (!file) return
  if (!file.type.startsWith('image/')) {
    auth.error = 'Please upload an image file.'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    auth.error = 'Image should be under 2MB.'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.avatarData = reader.result
    form.avatarName = file.name
    auth.error = null
  }
  reader.readAsDataURL(file)
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

  if (isSocial.value) {
    try {
      const res = await fetch(`${AUTH_SERVER_ORIGIN}/profile`, {
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
          avatar: form.avatarData || null,
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
    email: form.email,
    name: form.name,
    password: form.password,
    confirm: form.confirm,
    sex: form.sex,
    birthday: form.birthday,
    height: form.height,
    weight: form.weight,
    avatarData: form.avatarData
  }
  const ok = await auth.register(payload)
  if (!ok) return
  router.push('/onboarding')
}

function startVerifyTimer() {
  if (verifyTimer) {
    clearInterval(verifyTimer)
    verifyTimer = null
  }
  verification.remaining = 60
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
  verification.sentCode = String(Math.floor(100000 + Math.random() * 900000))
  verification.notice = 'Verification code sent. Please check your email.'
  startVerifyTimer()
}

async function confirmVerification() {
  verification.touched = true
  verification.error = ''
  if (!verification.code) {
    verification.error = 'Please enter the verification code.'
    return
  }
  if (verification.remaining <= 0) {
    verification.error = 'Code expired. Please resend.'
    return
  }
  if (verification.code !== verification.sentCode) {
    verification.error = 'Incorrect code.'
    return
  }
  if (!pendingPayload.value) {
    verification.error = 'Missing registration details. Please start again.'
    return
  }
  const ok = await auth.register(pendingPayload.value)
  if (!ok) return
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
  padding: 80px 24px;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.auth-container {
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.1fr);
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
  gap: 32px;
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
  gap: 20px;
}

.field {
  display: grid;
  gap: 10px;
}

.field-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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

.helper {
  margin: 0;
  font-size: 13px;
  color: #6e6e73;
}

.helper-error {
  color: #d70015;
}

.helper-warning {
  color: #c47f00;
}

.segmented {
  display: inline-flex;
  padding: 6px;
  border-radius: 999px;
  background: rgba(210, 210, 215, 0.25);
  gap: 6px;
}

.segment {
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #6e6e73;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.segment.active {
  background: #111;
  color: #f5f5f7;
}

.avatar-field {
  display: grid;
  gap: 8px;
}

.avatar-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid rgba(210, 210, 215, 0.8);
  border-radius: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.avatar-box:focus-within {
  border-color: #0071e3;
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.15);
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-height: 40px;
}

.upload-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #1d1d1f;
}

.upload-action {
  font-weight: 600;
}

.filename {
  color: #6e6e73;
  font-size: 13px;
}

.avatar-preview {
  display: grid;
  gap: 6px;
  justify-items: center;
  text-align: center;
  cursor: pointer;
}

.preview-label {
  font-size: 11px;
  color: #8e8e93;
}

.preview-thumb {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: rgba(210, 210, 215, 0.3);
  border: 1px dashed rgba(118, 118, 128, 0.4);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-style: solid;
  border-color: rgba(210, 210, 215, 0.4);
}

.preview-thumb.empty {
  border-style: dashed;
}

.placeholder-icon {
  font-size: 24px;
  color: #6e6e73;
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

.carousel {
  position: relative;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(17, 17, 17, 0.18);
}

.carousel-track {
  display: flex;
  width: 100%;
  transition: transform 0.6s cubic-bezier(0.33, 1, 0.68, 1);
}

.carousel-slide {
  position: relative;
  flex: 0 0 100%;
  min-height: 210px;
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.carousel-dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.32);
  backdrop-filter: blur(10px);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.dot.active {
  background: #fff;
  transform: scale(1.2);
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

  .auth-container {
    padding: 32px 24px;
    border-radius: 28px;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
