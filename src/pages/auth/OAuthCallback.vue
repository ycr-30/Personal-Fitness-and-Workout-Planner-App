<template>
  <div class="oauth-callback" aria-hidden="true"></div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const redirectPath = computed(() => {
  const raw = route.query.redirect
  if (typeof raw !== 'string') return ''
  if (!raw.startsWith('/')) return ''
  return raw
})

function decodeOAuthErrorMessage(value) {
  const normalized = String(value || '').replace(/\+/g, ' ')
  try {
    return decodeURIComponent(normalized)
  } catch {
    return normalized
  }
}

function readHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''))
}

function resolvePostLoginTarget() {
  if (auth.user?.onboarding?.completed && redirectPath.value) return redirectPath.value
  return auth.user?.onboarding?.completed ? '/dashboard' : '/onboarding'
}

async function redirectToLogin(errorMessage = '') {
  const nextQuery = {}
  if (redirectPath.value) nextQuery.redirect = redirectPath.value
  if (errorMessage) nextQuery.oauth_error = errorMessage
  await router.replace({ name: 'login', query: nextQuery })
}

async function completeSupabaseLogin(sessionUser) {
  if (!sessionUser?.id) {
    await redirectToLogin('Google sign-in finished, but no cloud session was created. Please try again.')
    return
  }

  const syncedUser = await auth.hydrateFromSupabaseSession()
  if (!syncedUser) {
    await redirectToLogin(auth.error || 'Unable to complete sign-in. Please try again.')
    return
  }

  await router.replace(resolvePostLoginTarget())
}

async function handleBackendGoogleCallback() {
  const hashParams = readHashParams()
  const provider = String(hashParams.get('provider') || '').trim().toLowerCase()
  const idToken = String(hashParams.get('google_id_token') || '').trim()
  const accessToken = String(hashParams.get('google_access_token') || '').trim()

  if (provider !== 'google' || !idToken) return false

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    access_token: accessToken || undefined
  })
  if (error) throw error

  await completeSupabaseLogin(data?.session?.user || data?.user || null)
  return true
}

async function handleSupabaseCodeCallback() {
  const oauthError =
    typeof route.query.error_description === 'string'
      ? route.query.error_description
      : typeof route.query.error === 'string'
        ? route.query.error
        : ''
  if (oauthError) {
    await redirectToLogin(decodeOAuthErrorMessage(oauthError))
    return true
  }

  const authCode = typeof route.query.code === 'string' ? route.query.code.trim() : ''
  if (!authCode) return false

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode)
  if (exchangeError) throw exchangeError

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  await completeSupabaseLogin(sessionData?.session?.user || null)
  return true
}

onMounted(async () => {
  if (!supabase) {
    await redirectToLogin('Supabase auth is not configured.')
    return
  }

  try {
    const handledBackendBridge = await handleBackendGoogleCallback()
    if (handledBackendBridge) return

    const handledSupabaseCode = await handleSupabaseCodeCallback()
    if (handledSupabaseCode) return

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const sessionUser = sessionData?.session?.user || null
    if (sessionUser?.id) {
      await completeSupabaseLogin(sessionUser)
      return
    }

    await redirectToLogin()
  } catch (error) {
    console.error('OAuth callback failed', error)
    await redirectToLogin(error?.message || 'Google sign-in failed. Please try again.')
  }
})
</script>

<style scoped>
.oauth-callback {
  min-height: 100vh;
  background: transparent;
}
</style>
