// src/stores/auth.js
import { defineStore } from 'pinia'

const USERS_KEY = 'pf_users' // 所有注册用户（原型阶段使用浏览器本地存储）
const CURRENT_KEY = 'pf_current_user' // 当前登录用户的账号键
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/ // 邮箱格式校验
const USERNAME_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/ // 用户名规则：≥6 且含大小写字母与数字
const AUTH_SERVER_ORIGIN = import.meta.env.VITE_AUTH_SERVER_ORIGIN || 'http://localhost:4000' // 鉴权服务地址

function readUsers() {
  const raw = localStorage.getItem(USERS_KEY)
  return raw ? JSON.parse(raw) : {}
}

function writeUsers(obj) {
  localStorage.setItem(USERS_KEY, JSON.stringify(obj))
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

    async hydrateFromServer() {
      if (this.user) return
      try {
        const res = await fetch(`${AUTH_SERVER_ORIGIN}/me`, {
          credentials: 'include'
        })
        if (!res.ok) return
        const data = await res.json()
        if (data?.user) {
          this.user = pickUserSnapshot({
            ...data.user,
            onboarding: {
              completed: !!data.user.onboardingCompleted,
              answers: null
            }
          })
        }
      } catch (err) {
        console.error('hydrateFromServer failed', err)
      }
    },

    async register(payload) {
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
      const trimmedAccount = account.trim()
      const isEmail = EMAIL_PATTERN.test(trimmedAccount)
      const isUsername = USERNAME_PATTERN.test(trimmedAccount)
      if (!isEmail && !isUsername) {
        this.error = 'Please enter a valid account (email or 6+ chars with upper, lower, digits).'
        return false
      }
      const trimmedEmail = payload.email ? payload.email.trim() : ''
      if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
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

      this.loading = true
      await new Promise((resolve) => setTimeout(resolve, 400)) // 模拟网络延迟

      const users = readUsers()
      const accountKey = trimmedAccount.toLowerCase()
      if (users[accountKey]) {
        this.loading = false
        this.error = 'Account already registered.'
        return false
      }
      const emailToCheck = trimmedEmail || (isEmail ? trimmedAccount : '')
      if (emailToCheck) {
        for (const record of Object.values(users)) {
          if (record.email && record.email.toLowerCase() === emailToCheck.toLowerCase()) {
            this.loading = false
            this.error = 'Email already registered.'
            return false
          }
        }
      }

      const storedEmail = trimmedEmail || (isEmail ? trimmedAccount : '')

      const bodyFat = calculateBodyFat({
        heightCm: numericHeight,
        weightKg: numericWeight,
        birthday,
        sex: normalizedSex
      })

      const userRecord = {
        account: trimmedAccount,
        accountKey,
        email: storedEmail,
        name,
        password,
        sex: normalizedSex,
        birthday,
        height: numericHeight,
        weight: numericWeight,
        bodyFat,
        avatar: avatarData || '',
        onboarding: { completed: false, answers: null }
      }

      users[accountKey] = userRecord
      writeUsers(users)
      localStorage.setItem(CURRENT_KEY, accountKey)
      this.user = pickUserSnapshot(userRecord)
      this.loading = false
      return true
    },

    async login({ identifier, password, remember = true }) {
      this.error = null
      const trimmedIdentifier = identifier?.trim?.() || ''
      if (!trimmedIdentifier && !password) {
        this.error = 'Account and password are required.'
        return false
      }
      if (!trimmedIdentifier) {
        this.error = 'Account is required.'
        return false
      }
      if (!password) {
        this.error = 'Password is required.'
        return false
      }
      if (
        !EMAIL_PATTERN.test(trimmedIdentifier) &&
        !USERNAME_PATTERN.test(trimmedIdentifier)
      ) {
        this.error = 'Please enter a valid account or email.'
        return false
      }
      this.loading = true
      await new Promise((resolve) => setTimeout(resolve, 300))

      const users = readUsers()
      const lookupKey = trimmedIdentifier.toLowerCase()
      let record = users[lookupKey]
      let storedKey = lookupKey
      if (!record) {
        for (const [key, entry] of Object.entries(users)) {
          const candidateAccount = entry.account?.toLowerCase?.()
          const candidateEmail = entry.email?.toLowerCase?.()
          if (candidateAccount === lookupKey || candidateEmail === lookupKey || key === trimmedIdentifier) {
            record = entry
            storedKey = key
            break
          }
        }
      }
      if (!record || record.password !== password) {
        this.loading = false
        this.error = 'Incorrect account or password.'
        return false
      }
      if (remember) {
        localStorage.setItem(CURRENT_KEY, record.accountKey || storedKey)
      } else {
        localStorage.removeItem(CURRENT_KEY)
      }
      this.user = pickUserSnapshot(record)
      this.loading = false
      return true
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

    async setUserFromSupabase(user) {
      if (!user) return false
      const email = user.email || ''
      const accountKey = email.toLowerCase() || user.id
      const users = readUsers()
      if (!users[accountKey]) {
        users[accountKey] = {
          id: user.id,
          account: email || user.id,
          accountKey,
          email,
          name: user.user_metadata?.full_name || email.split('@')[0] || 'User',
          password: '',
          sex: 'female',
          birthday: '',
          height: '',
          weight: '',
          bodyFat: null,
          avatar: user.user_metadata?.avatar_url || '',
          theme: 'light',
          onboarding: { completed: false, answers: null }
        }
        writeUsers(users)
      } else if (!users[accountKey].id && user.id) {
        users[accountKey] = { ...users[accountKey], id: user.id }
        writeUsers(users)
      }
      if (!users[accountKey].theme) {
        users[accountKey].theme = 'light'
        writeUsers(users)
      }
      localStorage.setItem(CURRENT_KEY, accountKey)
      this.user = pickUserSnapshot(users[accountKey])
      this.error = null
      return true
    },

    async logout() {
      try {
        await fetch(`${AUTH_SERVER_ORIGIN}/logout`, {
          method: 'POST',
          credentials: 'include'
        })
      } catch (err) {
        console.error('logout request failed', err)
      }
      localStorage.removeItem(CURRENT_KEY)
      this.user = null
      this.error = null
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

      // 如果有后端会话（通过 hydrateFromServer 获得 id/provider 等），优先写后端
      if (this.user.id) {
        try {
          const res = await fetch(`${AUTH_SERVER_ORIGIN}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              onboardingCompleted: true,
              onboardingAnswers: answers
            })
          })
          if (res.ok) {
            const data = await res.json()
            if (data?.user) {
              this.user = pickUserSnapshot({
                ...data.user,
                onboarding: { completed: true, answers }
              })
            } else {
              this.user = {
                ...this.user,
                onboarding: { completed: true, answers }
              }
            }
            return
          }
        } catch (err) {
          console.error('completeOnboarding server failed', err)
        }
      }

      // 本地存储回退（原有前端-only 模式）
      const users = readUsers()
      const current = users[this.user.email]
      if (!current) {
        this.user = {
          ...this.user,
          onboarding: { completed: true, answers }
        }
        return
      }
      const merged = {
        ...current,
        onboarding: {
          completed: true,
          answers
        }
      }
      users[this.user.email] = merged
      writeUsers(users)
      this.user = pickUserSnapshot(merged)
    }
  }
})
