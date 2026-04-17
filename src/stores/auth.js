// src/stores/auth.js
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'
import { buildAuthServerUrl } from '@/lib/authServerOrigin'
import { loadUserOnboardingAnswers, normalizeOnboardingAnswers, saveUserOnboardingAnswers } from '@/lib/userOnboardingCloud'

const USERS_KEY = 'pf_users' // 所有注册用户（原型阶段使用浏览器本地存储）
const CURRENT_KEY = 'pf_current_user' // 当前登录用户的账号键
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/ // 邮箱格式校验
let activeCloudOnboardingIdentity = ''
let serverHydratePromise = null
let lastServerHydrateAt = 0

function normalizeSupabaseAuthMessage(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeSupabaseMetadataString(value) {
  return String(value ?? '').trim()
}

function normalizeSupabaseMetadataNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function splitDisplayName(value = '') {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ')
  }
}

function buildSupabaseRegistrationMetadata(payload = {}) {
  const sex = String(payload.sex || '').trim().toLowerCase() === 'male' ? 'male' : 'female'
  const heightCm = normalizeSupabaseMetadataNumber(payload.height)
  const weightKg = normalizeSupabaseMetadataNumber(payload.weight)

  return {
    full_name: normalizeSupabaseMetadataString(payload.name) || null,
    sex,
    birthday: normalizeSupabaseMetadataString(payload.birthday) || null,
    height_cm: heightCm,
    weight_kg: weightKg
  }
}

async function upsertSupabaseRegistrationProfile(user, payload = {}) {
  if (!supabase || !user?.id) return
  const metadata = buildSupabaseRegistrationMetadata(payload)
  const nameParts = splitDisplayName(metadata.full_name || '')
  const profilePayload = {
    user_id: user.id,
    first_name: nameParts.firstName || null,
    last_name: nameParts.lastName || null,
    display_name: metadata.full_name || null,
    sex: metadata.sex || null,
    birthday: metadata.birthday || null,
    height_cm: metadata.height_cm,
    weight_kg: metadata.weight_kg
  }
  const { error } = await supabase
    .from('user_profiles')
    .upsert(profilePayload, { onConflict: 'user_id' })
  if (error) throw error
}

function readUsers() {
  const raw = localStorage.getItem(USERS_KEY)
  return raw ? JSON.parse(raw) : {}
}

function writeUsers(obj) {
  localStorage.setItem(USERS_KEY, JSON.stringify(obj))
}

function cacheUserRecord(record) {
  if (!record) return
  const users = readUsers()
  const accountKey =
    record.accountKey ||
    record.account?.toLowerCase?.() ||
    record.email?.toLowerCase?.() ||
    record.id
  if (!accountKey) return
  const { password, ...safeRecord } = record
  users[accountKey] = safeRecord
  writeUsers(users)
}

function pickUserSnapshot(record) {
  if (!record) return null
  const { password, ...rest } = record
  const completed =
    record.onboardingCompleted ??
    record.onboarding?.completed ??
    false
  const answers =
    record.onboardingAnswers ??
    record.onboarding?.answers ??
    null
  rest.onboarding = { completed, answers }
  return rest
}

function getAgeFromBirthday(birthday) {
  const birthDate = new Date(birthday)
  if (Number.isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

function calculateBodyFat({ heightCm, weightKg, birthday, sex }) {
  const height = Number(heightCm)
  const weight = Number(weightKg)
  const age = getAgeFromBirthday(birthday)
  if (!height || !weight || !age) return null
  const heightMeter = height / 100
  if (!heightMeter) return null
  const bmi = weight / (heightMeter * heightMeter)
  if (!Number.isFinite(bmi)) return null
  const sexFlag = sex === 'male' ? 1 : 0
  const result = 1.2 * bmi + 0.23 * age - 10.8 * sexFlag - 5.4
  return Number.isFinite(result) ? Number(result.toFixed(1)) : null
}

function clearCurrentAuthSnapshot(store) {
  activeCloudOnboardingIdentity = ''
  localStorage.removeItem(CURRENT_KEY)
  store.user = null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // 已登录用户快照
    loading: false,
    error: null
  }),
  getters: {
    isAuthed: (state) => !!state.user,
    avatar: (state) => state.user?.avatar || ''
  },
  actions: {
    init() {
      const key = localStorage.getItem(CURRENT_KEY)
      if (!key) return
      const users = readUsers()
      if (users[key]) {
        this.user = pickUserSnapshot(users[key])
        return
      }
      // 兼容旧数据：遍历查找账号或邮箱匹配
      for (const [storedKey, record] of Object.entries(users)) {
        const candidate = record.account?.toLowerCase?.() || record.email?.toLowerCase?.() || storedKey
        if (candidate === key.toLowerCase()) {
          this.user = pickUserSnapshot(record)
          localStorage.setItem(CURRENT_KEY, storedKey)
          return
        }
      }
    },

    async hydrateFromServer({ force = false, maxAgeMs = 30000 } = {}) {
      const now = Date.now()
      if (!force && lastServerHydrateAt && now - lastServerHydrateAt < maxAgeMs) {
        return this.user
      }
      if (serverHydratePromise) return serverHydratePromise

      serverHydratePromise = (async () => {
        try {
        const res = await fetch(buildAuthServerUrl('/me'), {
          credentials: 'include'
        })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            activeCloudOnboardingIdentity = ''
            localStorage.removeItem(CURRENT_KEY)
            this.user = null
          } else if (this.user?.provider) {
            this.user = null
          }
          lastServerHydrateAt = Date.now()
          return this.user
        }
        const data = await res.json()
        if (data?.user) {
          const nextUser = pickUserSnapshot({
            ...data.user,
            onboarding: {
              completed: !!data.user.onboardingCompleted,
              answers:
                data.user.onboardingAnswers ??
                data.user.onboarding?.answers ??
                null
            }
          })
          const nextAccountKey =
            nextUser?.accountKey ||
            nextUser?.email?.toLowerCase?.() ||
            nextUser?.account?.toLowerCase?.() ||
            nextUser?.id ||
            ''
          if (nextAccountKey) {
            localStorage.setItem(CURRENT_KEY, nextAccountKey)
          }
          cacheUserRecord(nextUser)
          this.user = nextUser
        }
        lastServerHydrateAt = Date.now()
        return this.user
      } catch (err) {
        console.error('hydrateFromServer failed', err)
        lastServerHydrateAt = Date.now()
        return this.user
      } finally {
        serverHydratePromise = null
      }
      })()

      return serverHydratePromise
    },

    async hydrateFromSupabaseSession() {
      if (!supabase) return null
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('hydrateFromSupabaseSession failed', error)
          return null
        }
        const sessionUser = data?.session?.user || null
        if (!sessionUser) return null
        await this.setUserFromSupabase(sessionUser)
        const synced = await this.syncServerSessionFromSupabase()
        if (!synced) {
          await this.rollbackSupabaseAuthState(
            'Signed in with Supabase, but failed to start the app session. Please restart the auth server and try again.'
          )
          return null
        }
        return sessionUser
      } catch (err) {
        console.error('hydrateFromSupabaseSession failed', err)
        return null
      }
    },

    async beginLocalRegistration(payload, { resend = false } = {}) {
      const {
        account,
        name,
        password,
        confirm,
        sex,
        birthday,
        height,
        weight,
        avatarData
      } = payload
      this.error = null
      if (!account || !name || !password || !birthday || !height || !weight) {
        this.error = 'Please complete all required fields.'
        return false
      }
      const trimmedEmail = account.trim()
      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        this.error = 'Please enter a valid email address.'
        return false
      }
      if (password.length < 6) {
        this.error = 'Password must be at least 6 characters.'
        return false
      }
      if (password !== confirm) {
        this.error = 'Passwords do not match.'
        return false
      }
      const normalizedSex = sex === 'male' ? 'male' : 'female'
      const numericHeight = Number(height)
      const numericWeight = Number(weight)
      if (!numericHeight || !numericWeight) {
        this.error = 'Height and weight must be valid numbers.'
        return false
      }
      if (!supabase) {
        this.error = 'Supabase auth is not configured.'
        return null
      }

      this.loading = true
      try {
        const registrationMetadata = buildSupabaseRegistrationMetadata({
          name,
          sex: normalizedSex,
          birthday,
          height: numericHeight,
          weight: numericWeight,
          avatarData
        })

        if (resend) {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: trimmedEmail,
            options: {
              emailRedirectTo: `${window.location.origin}/register?mode=confirm`
            }
          })
          if (error) {
            this.error = error.message || 'Failed to resend verification code.'
            return null
          }
        } else {
          const { data, error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/register?mode=confirm`,
              data: registrationMetadata
            }
          })
          if (error) {
            const normalizedMessage = normalizeSupabaseAuthMessage(error.message)
            if (normalizedMessage.includes('already registered')) {
              this.error = 'This email already has an account. Sign in with your password or reset it if needed.'
            } else {
              this.error = error.message || 'Failed to create verification state.'
            }
            return null
          }

          const authedUser = data?.session?.user || data?.user || null
          const isAlreadyVerified = Boolean(data?.session?.access_token || authedUser?.email_confirmed_at)
          if (authedUser?.id && isAlreadyVerified) {
            await this.setUserFromSupabase(authedUser)
            await this.syncServerSessionFromSupabase()
            try {
              await upsertSupabaseRegistrationProfile(authedUser, {
                name,
                sex: normalizedSex,
                birthday,
                height: numericHeight,
                weight: numericWeight,
                avatarData: avatarData || ''
              })
            } catch (profileError) {
              console.error('Supabase registration profile seed failed', profileError)
            }
            return {
              ok: true,
              verified: true,
              deliveryTarget: trimmedEmail,
              resendIn: 60,
              notice: 'Account created.'
            }
          }
        }
        return {
          ok: true,
          deliveryTarget: trimmedEmail,
          resendIn: 60,
          expiresIn: 60,
          debugCode: '',
          notice: resend ? 'Verification code resent.' : 'Verification code sent.'
        }
      } catch (err) {
        console.error('beginSupabaseRegistration failed', err)
        this.error = 'Failed to create verification state.'
        return null
      } finally {
        this.loading = false
      }
    },

    async confirmLocalRegistration({ account, code, profile = null }) {
      const trimmedEmail = account?.trim?.() || ''
      const trimmedCode = code?.trim?.() || ''
      this.error = null
      if (!trimmedEmail || !trimmedCode) {
        this.error = 'Email and verification code are required.'
        return false
      }
      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        this.error = 'Please enter a valid email address.'
        return false
      }
      if (!/^\d{6}$/.test(trimmedCode)) {
        this.error = 'Please enter a valid 6-digit verification code.'
        return false
      }
      if (!supabase) {
        this.error = 'Supabase auth is not configured.'
        return false
      }

      this.loading = true
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: trimmedCode,
          type: 'email'
        })
        if (error) {
          const normalizedMessage = normalizeSupabaseAuthMessage(error.message)
          if (normalizedMessage.includes('expired')) {
            this.error = 'Verification code expired. Please resend.'
          } else {
            this.error = error.message || 'Failed to complete registration.'
          }
          return false
        }
        const metadata = buildSupabaseRegistrationMetadata(profile || {})
        const authUser = data?.user || data?.session?.user || null
        let sessionUser = authUser

        if (authUser?.id && profile) {
          const { data: updatedData, error: updateError } = await supabase.auth.updateUser({
            data: metadata
          })
          if (updateError) {
            console.error('Supabase registration metadata sync failed', updateError)
          } else if (updatedData?.user?.id) {
            sessionUser = updatedData.user
          }
        }

        if (!sessionUser?.id) {
          const { data: userData, error: userError } = await supabase.auth.getUser()
          if (userError || !userData?.user?.id) {
            this.error = 'Failed to complete registration.'
            return false
          }
          sessionUser = userData.user
        }

        await this.setUserFromSupabase(sessionUser)
        const synced = await this.syncServerSessionFromSupabase()
        if (!synced) {
          await this.rollbackSupabaseAuthState(
            'Email verified, but failed to start the app session. Please restart the auth server and try again.'
          )
          return false
        }
        if (profile) {
          try {
            await upsertSupabaseRegistrationProfile(sessionUser, profile)
          } catch (profileError) {
            console.error('Supabase registration profile seed failed', profileError)
          }
        }
        return true
      } catch (err) {
        console.error('confirmSupabaseRegistration failed', err)
        this.error = 'Failed to complete registration.'
        return false
      } finally {
        this.loading = false
      }
    },

    async login({ identifier, password, remember = true }) {
      this.error = null
      const trimmedIdentifier = identifier?.trim?.() || ''
      if (!trimmedIdentifier && !password) {
        this.error = 'Email and password are required.'
        return false
      }
      if (!EMAIL_PATTERN.test(trimmedIdentifier)) {
        this.error = 'Please enter a valid email address.'
        return false
      }
      if (!password) {
        this.error = 'Password is required.'
        return false
      }
      if (!supabase) {
        this.error = 'Supabase auth is not configured.'
        return false
      }
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedIdentifier,
          password
        })
        if (error || !data?.user) {
          const normalizedMessage = normalizeSupabaseAuthMessage(error?.message)
          if (normalizedMessage.includes('email not confirmed')) {
            this.error = 'Please verify your email before signing in.'
          } else if (
            normalizedMessage.includes('invalid login credentials') ||
            normalizedMessage.includes('invalid credentials') ||
            normalizedMessage.includes('invalid grant')
          ) {
            this.error = 'Incorrect email or password.'
          } else {
            this.error = error?.message || 'Incorrect email or password.'
          }
          return false
        }
        await this.setUserFromSupabase(data.user)
        const synced = await this.syncServerSessionFromSupabase()
        if (!synced) {
          await this.rollbackSupabaseAuthState('The email or password you entered is incorrect.')
          return false
        }
        if (remember) {
          localStorage.setItem(CURRENT_KEY, trimmedIdentifier.toLowerCase())
        } else {
          localStorage.removeItem(CURRENT_KEY)
        }
        return true
      } catch (err) {
        console.error('Supabase password login failed', err)
        this.error = 'The email or password you entered is incorrect.'
        return false
      } finally {
        this.loading = false
      }
    },

    async sendPasswordResetCode(email) {
      this.error = null
      const trimmedEmail = email?.trim?.() || ''
      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        this.error = 'Invalid email address'
        return null
      }
      if (!supabase) {
        this.error = 'Supabase auth is not configured.'
        return null
      }

      this.loading = true
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}/login?mode=recovery`
        })
        if (error) {
          this.error = error.message || 'Failed to send verification code.'
          return null
        }
        return {
          success: true,
          message: 'If an account exists for this email, a password reset link has been sent.',
          resendIn: 60
        }
      } catch (err) {
        console.error('sendPasswordResetCode failed', err)
        this.error = 'Failed to send password reset link.'
        return null
      } finally {
        this.loading = false
      }
    },

    async verifyPasswordResetCode({ email, code }) {
      this.error = null
      const trimmedEmail = email?.trim?.() || ''
      const trimmedCode = code?.trim?.() || ''
      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        this.error = 'Invalid email address'
        return null
      }
      if (!/^\d{6}$/.test(trimmedCode)) {
        this.error = 'Invalid verification code'
        return null
      }
      if (!supabase) {
        this.error = 'Supabase auth is not configured.'
        return null
      }

      this.loading = true
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: trimmedCode,
          type: 'recovery'
        })
        if (error) {
          const normalizedMessage = normalizeSupabaseAuthMessage(error.message)
          if (normalizedMessage.includes('expired')) {
            this.error = 'Verification code expired'
          } else {
            this.error = 'Invalid verification code'
          }
          return null
        }
        const sessionUser = data?.session?.user || null
        if (!sessionUser?.id) {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          if (sessionError || !sessionData?.session?.user?.id) {
            this.error = 'Recovery session expired. Please request a new code.'
            return null
          }
          return {
            success: true,
            email: sessionData.session.user.email || trimmedEmail
          }
        }
        return {
          success: true,
          email: sessionUser.email || trimmedEmail
        }
      } catch (err) {
        console.error('verifyPasswordResetCode failed', err)
        this.error = 'Failed to verify code.'
        return null
      } finally {
        this.loading = false
      }
    },

    async confirmPasswordReset({ email, newPassword, confirmPassword }) {
      this.error = null
      if (!newPassword || newPassword.length < 6) {
        this.error = 'Password must meet minimum security requirements'
        return null
      }
      if (newPassword !== confirmPassword) {
        this.error = 'Passwords do not match'
        return null
      }
      if (!supabase) {
        this.error = 'Supabase auth is not configured.'
        return null
      }

      this.loading = true
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData?.session?.user?.id) {
          this.error = 'Recovery session expired. Please request a new code.'
          return null
        }
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        })
        if (error) {
          this.error = error.message || 'Failed to update password.'
          return null
        }
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error('Supabase signOut after password reset failed', signOutError)
        }
        try {
          await fetch(buildAuthServerUrl('/logout'), {
            method: 'POST',
            credentials: 'include'
          })
        } catch (logoutError) {
          console.error('Backend logout after password reset failed', logoutError)
        }
        activeCloudOnboardingIdentity = ''
        localStorage.removeItem(CURRENT_KEY)
        this.user = null
        return {
          success: true,
          message: 'Password updated. You can now sign in with your new password.',
          email: sessionData.session.user.email || email?.trim?.() || ''
        }
      } catch (err) {
        console.error('confirmPasswordReset failed', err)
        this.error = 'Failed to update password.'
        return null
      } finally {
        this.loading = false
      }
    },

    async loginWithEmailOtp({ email }) {
      const trimmedEmail = email?.trim?.() || ''
      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        this.error = 'Please enter a valid email address.'
        return false
      }
      this.loading = true
      const users = readUsers()
      const lookupKey = trimmedEmail.toLowerCase()
      let record = users[lookupKey]
      if (!record) {
        record = {
          account: trimmedEmail,
          accountKey: lookupKey,
          email: trimmedEmail,
          name: trimmedEmail.split('@')[0] || 'User',
          password: '',
          sex: 'female',
          birthday: '',
          height: '',
          weight: '',
          bodyFat: null,
          avatar: '',
          theme: 'light',
          onboarding: { completed: false, answers: null }
        }
        users[lookupKey] = record
        writeUsers(users)
      }
      localStorage.setItem(CURRENT_KEY, record.accountKey || lookupKey)
      this.user = pickUserSnapshot(record)
      this.loading = false
      return true
    },

    async syncServerSessionFromSupabase() {
      if (!supabase) return false
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        const accessToken = data?.session?.access_token || ''
        if (!accessToken) return false

        const response = await fetch(buildAuthServerUrl('/auth/supabase/session'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          credentials: 'include'
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload?.error || 'Failed to sync backend session.')
        }
        lastServerHydrateAt = Date.now()
        return true
      } catch (err) {
        console.error('syncServerSessionFromSupabase failed', err)
        return false
      }
    },

    async setUserFromSupabase(user) {
      if (!user) return false
      const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}
      const email = user.email || ''
      const accountKey = email.toLowerCase() || user.id
      const users = readUsers()
      const existing = users[accountKey] || {}
      const nextHeight = normalizeSupabaseMetadataNumber(metadata.height_cm ?? metadata.height)
      const nextWeight = normalizeSupabaseMetadataNumber(metadata.weight_kg ?? metadata.weight)
      const nextBirthday = normalizeSupabaseMetadataString(metadata.birthday) || existing.birthday || ''
      const nextSexRaw = normalizeSupabaseMetadataString(metadata.sex).toLowerCase()
      const nextSex = nextSexRaw === 'male' ? 'male' : nextSexRaw === 'female' ? 'female' : existing.sex || 'female'
      const nextName =
        normalizeSupabaseMetadataString(metadata.full_name || metadata.name) ||
        existing.name ||
        email.split('@')[0] ||
        'User'
      const nextAvatar = normalizeSupabaseMetadataString(metadata.avatar_url) || existing.avatar || ''
      const merged = {
        ...existing,
        id: user.id,
        account: email || existing.account || user.id,
        accountKey,
        email,
        name: nextName,
        password: '',
        sex: nextSex,
        birthday: nextBirthday,
        height: nextHeight ?? existing.height ?? '',
        weight: nextWeight ?? existing.weight ?? '',
        bodyFat: calculateBodyFat({
          heightCm: nextHeight ?? existing.height ?? null,
          weightKg: nextWeight ?? existing.weight ?? null,
          birthday: nextBirthday,
          sex: nextSex
        }),
        avatar: nextAvatar,
        theme: existing.theme || 'light',
        onboarding: existing.onboarding || { completed: false, answers: null }
      }
      users[accountKey] = merged
      writeUsers(users)
      localStorage.setItem(CURRENT_KEY, accountKey)
      const nextUser = pickUserSnapshot(users[accountKey])
      cacheUserRecord(nextUser)
      this.user = nextUser
      activeCloudOnboardingIdentity = ''
      await this.hydrateOnboardingFromSupabase({ force: true })
      this.error = null
      return true
    },

    async logout() {
      try {
        await fetch(buildAuthServerUrl('/logout'), {
          method: 'POST',
          credentials: 'include'
        })
      } catch (err) {
        console.error('logout request failed', err)
      }
      if (supabase) {
        try {
          await supabase.auth.signOut()
        } catch (err) {
          console.error('Supabase logout failed', err)
        }
      }
      clearCurrentAuthSnapshot(this)
      lastServerHydrateAt = 0
      this.error = null
    },

    async rollbackSupabaseAuthState(message = '') {
      if (supabase) {
        try {
          await supabase.auth.signOut()
        } catch (err) {
          console.error('Supabase rollback signOut failed', err)
        }
      }
      try {
        await fetch(buildAuthServerUrl('/logout'), {
          method: 'POST',
          credentials: 'include'
        })
      } catch (err) {
        console.error('Backend rollback logout failed', err)
      }
      clearCurrentAuthSnapshot(this)
      lastServerHydrateAt = 0
      this.error = message || null
      return false
    },

    applyOnboardingAnswers(answers) {
      if (!this.user) return null

      const normalized = normalizeOnboardingAnswers(answers)
      if (!normalized) return null

      const users = readUsers()
      const currentKey = localStorage.getItem(CURRENT_KEY)
      let key = null

      if (this.user.email && users[this.user.email]) {
        key = this.user.email
      } else if (currentKey && users[currentKey]) {
        key = currentKey
      } else if (this.user.account && users[this.user.account.toLowerCase()]) {
        key = this.user.account.toLowerCase()
      }

      const current = key ? users[key] : null
      const merged = {
        ...(current || this.user),
        onboardingCompleted: true,
        onboardingAnswers: normalized,
        onboarding: {
          completed: true,
          answers: normalized
        }
      }

      if (key) {
        users[key] = merged
        writeUsers(users)
      }

      this.user = pickUserSnapshot(merged)
      activeCloudOnboardingIdentity = this.user?.id || this.user?.email || this.user?.account || ''
      return normalized
    },

    async hydrateOnboardingFromSupabase({ force = false } = {}) {
      if (!this.user) return null

      const identity = this.user.id || this.user.email || this.user.account || ''
      if (!force && activeCloudOnboardingIdentity === identity) {
        return this.user.onboarding || null
      }

      activeCloudOnboardingIdentity = identity

      try {
        const answers = await loadUserOnboardingAnswers()
        if (!answers) return this.user.onboarding || null
        this.applyOnboardingAnswers(answers)
        return this.user.onboarding || null
      } catch (err) {
        console.error('hydrateOnboardingFromSupabase failed', err)
        return this.user.onboarding || null
      }
    },

    updateProfile(updates) {
      if (!this.user) return
      const users = readUsers()
      const currentKey = localStorage.getItem(CURRENT_KEY)
      let key = null

      if (this.user.email && users[this.user.email]) {
        key = this.user.email
      } else if (currentKey && users[currentKey]) {
        key = currentKey
      } else if (this.user.account && users[this.user.account.toLowerCase()]) {
        key = this.user.account.toLowerCase()
      }

      const current = key ? users[key] : null
      const merged = {
        ...(current || this.user),
        ...updates
      }
      if (updates.sex) {
        merged.sex = updates.sex === 'male' ? 'male' : 'female'
      }
      if (updates.height !== undefined && updates.height !== null && updates.height !== '') {
        merged.height = Number(updates.height)
      }
      if (updates.weight !== undefined && updates.weight !== null && updates.weight !== '') {
        merged.weight = Number(updates.weight)
      }
      if (updates.height || updates.weight || updates.birthday || updates.sex) {
        const bodyFat = calculateBodyFat({
          heightCm: merged.height,
          weightKg: merged.weight,
          birthday: merged.birthday,
          sex: merged.sex
        })
        merged.bodyFat = bodyFat
      }
      if (key) {
        users[key] = merged
        writeUsers(users)
      }
      this.user = pickUserSnapshot(merged)
    },

    async completeOnboarding(answers) {
      if (!this.user) return
      const normalizedAnswers = normalizeOnboardingAnswers(answers)
      if (!normalizedAnswers) return

      // 如果有后端会话（通过 hydrateFromServer 获得 id/provider 等），优先写后端
      if (this.user.id) {
        try {
          const res = await fetch(buildAuthServerUrl('/profile'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              onboardingCompleted: true,
              onboardingAnswers: normalizedAnswers
            })
          })
          if (res.ok) {
            const data = await res.json()
            if (data?.user) {
              this.user = pickUserSnapshot({
                ...data.user,
                onboarding: { completed: true, answers: normalizedAnswers }
              })
            } else {
              this.user = {
                ...this.user,
                onboarding: { completed: true, answers: normalizedAnswers }
              }
            }
          } else {
            throw new Error('Profile update request failed.')
          }
        } catch (err) {
          console.error('completeOnboarding server failed', err)
        }
      }

      this.applyOnboardingAnswers(normalizedAnswers)

      try {
        const cloudAnswers = await saveUserOnboardingAnswers(normalizedAnswers)
        if (cloudAnswers) {
          this.applyOnboardingAnswers(cloudAnswers)
          return
        }
      } catch (err) {
        console.error('completeOnboarding supabase sync failed', err)
      }

      this.applyOnboardingAnswers(normalizedAnswers)
    }
  }
})
