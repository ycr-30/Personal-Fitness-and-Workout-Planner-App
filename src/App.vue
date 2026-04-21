<template>
  <div class="app-frame">
    <div v-if="showShell" class="app-shell">
      <AppHeader />
      <main class="app-main">
        <RouterView v-slot="{ Component }">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <div class="route-loading route-loading-shell" aria-hidden="true">
                <div class="route-loading-card">
                  <div class="route-loading-line route-loading-title"></div>
                  <div class="route-loading-line"></div>
                  <div class="route-loading-line route-loading-short"></div>
                </div>
              </div>
            </template>
          </Suspense>
        </RouterView>
      </main>
    </div>
    <main v-else class="app-main compact">
      <div v-if="suppressProtectedRouteContent" class="route-loading route-loading-compact" aria-hidden="true">
        <div class="route-loading-card">
          <div class="route-loading-line route-loading-title"></div>
          <div class="route-loading-line"></div>
          <div class="route-loading-line route-loading-short"></div>
        </div>
      </div>
      <template v-else>
      <RouterView v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="route-loading route-loading-compact" aria-hidden="true">
              <div class="route-loading-card">
                <div class="route-loading-line route-loading-title"></div>
                <div class="route-loading-line"></div>
                <div class="route-loading-line route-loading-short"></div>
              </div>
            </div>
          </template>
        </Suspense>
      </RouterView>
      </template>
    </main>

    <FloatingCoachChat v-if="showCoachChat" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'
import FloatingCoachChat from '@/components/FloatingCoachChat.vue'
import { useUserSettings } from '@/composables/useUserSettings'
import { syncLocalDataToSupabase, hydrateLocalDataFromSupabase } from '@/lib/supabaseSync'
import {
  applyCloudAppStateToLocal,
  fetchCloudAppState,
  getLocalAppStateMeta,
  isCloudAppStateNewerThanLocal,
  saveLocalAppStateToCloud
} from '@/lib/cloudStateApi'
import { getStableDeviceId, loadCloudClientState, saveCloudClientState } from '@/lib/cloudClientState'
import { getIdentityFromUser, getUserStorageKey } from '@/lib/userStorage'

const route = useRoute()
const auth = useAuthStore()
const { settings, loadSettings } = useUserSettings()

const hideShell = computed(() => route.meta?.hideShell)
const isPublicGuestRoute = computed(() => route.meta?.publicGuestRoute === true)
const showShell = computed(() => auth.isAuthed && !hideShell.value)
const showCoachChat = computed(() => showShell.value && !isPublicGuestRoute.value)
const suppressProtectedRouteContent = computed(() => !auth.isAuthed && route.meta?.requiresAuth === true)
const systemTheme = ref('light')
const syncInProgress = ref(false)
const syncTimer = ref(null)
const authIdentity = computed(() => auth.user?.account || auth.user?.email || auth.user?.name || null)
const APP_LOCAL_FLAGS_STATE_KEY = import.meta.env.DEV ? 'app_local_flags_dev' : 'app_local_flags'
const DEFAULT_PAGE_TITLE = 'KeepFit'
const DEFAULT_PAGE_DESCRIPTION = 'A calm control center for training, recovery, nutrition, and measurable progress.'

function syncKeyForUser(user) {
  const identity = getIdentityFromUser(user)
  return `pf_cloud_sync_done_${identity}`
}

function connectedKeyForUser(user) {
  const identity = getIdentityFromUser(user)
  return `pf_supabase_connected_${identity}`
}

function backendSyncKeyForUser(user) {
  const identity = getIdentityFromUser(user)
  return `pf_backend_sync_done_${identity}`
}

async function hydrateCloudFlags(user) {
  if (typeof window === 'undefined' || !user) return
  try {
    const state = await loadCloudClientState({
      scope: 'device',
      deviceId: getStableDeviceId(),
      keys: [APP_LOCAL_FLAGS_STATE_KEY]
    })
    const flags = state?.[APP_LOCAL_FLAGS_STATE_KEY]
    if (!flags || typeof flags !== 'object') return
    const key = syncKeyForUser(user)
    const connectedKey = connectedKeyForUser(user)
    const backendKey = backendSyncKeyForUser(user)
    if (flags.supabaseSynced) localStorage.setItem(key, '1')
    if (flags.connected) localStorage.setItem(connectedKey, '1')
    if (flags.backendSynced) localStorage.setItem(backendKey, '1')
  } catch (error) {
    console.error('Failed to hydrate app flags from cloud', error)
  }
}

function syncCloudFlags(user) {
  if (typeof window === 'undefined' || !user) return
  const key = syncKeyForUser(user)
  const connectedKey = connectedKeyForUser(user)
  const backendKey = backendSyncKeyForUser(user)
  saveCloudClientState({
    scope: 'device',
    deviceId: getStableDeviceId(),
    stateKey: APP_LOCAL_FLAGS_STATE_KEY,
    stateValue: {
      supabaseSynced: localStorage.getItem(key) === '1',
      connected: localStorage.getItem(connectedKey) === '1',
      backendSynced: localStorage.getItem(backendKey) === '1'
    }
  }).catch((error) => {
    console.error('Failed to save app flags to cloud', error)
  })
}

const preferredTheme = computed(() => settings.value?.theme || auth.user?.theme || 'light')
const resolvedTheme = computed(() =>
  preferredTheme.value === 'system' ? systemTheme.value : preferredTheme.value
)

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

function ensureDescriptionMeta() {
  if (typeof document === 'undefined') return null
  let meta = document.head.querySelector('meta[name="description"]')
  if (meta) return meta
  meta = document.createElement('meta')
  meta.setAttribute('name', 'description')
  document.head.appendChild(meta)
  return meta
}

function applyRouteMetadata() {
  if (typeof document === 'undefined') return
  const title = route.meta?.pageTitle || DEFAULT_PAGE_TITLE
  const description = route.meta?.pageDescription || DEFAULT_PAGE_DESCRIPTION
  document.title = title
  const meta = ensureDescriptionMeta()
  if (meta) {
    meta.setAttribute('content', description)
  }
}

watch(resolvedTheme, (theme) => {
  applyTheme(theme)
}, { immediate: true })

watch(
  () => route.fullPath,
  () => {
    applyRouteMetadata()
  },
  { immediate: true }
)

watch(
  [authIdentity, isPublicGuestRoute],
  async ([identity, isPublicRoute]) => {
    if (!identity || !auth.user || syncInProgress.value || isPublicRoute) return
    try {
      await auth.hydrateFromSupabaseSession()
    } catch (error) {
      console.error('Supabase session hydrate failed during app bootstrap', error)
    }
    await loadSettings({ force: true })
    await hydrateCloudFlags(auth.user)
    const key = syncKeyForUser(auth.user)
    const connectedKey = connectedKeyForUser(auth.user)
    const backendKey = backendSyncKeyForUser(auth.user)
    const alreadyConnected = localStorage.getItem(connectedKey) === '1'

    const hasLocalData =
      localStorage.getItem(getUserStorageKey('pf_plan_state', auth.user)) ||
      localStorage.getItem(getUserStorageKey('pf_workout_logs', auth.user)) ||
      localStorage.getItem(getUserStorageKey('pf_rest_days', auth.user))
    const localAppStateMeta = getLocalAppStateMeta(auth.user)

    let hydratedFromBackend = false
    let cloudState = null
    let hasCloudData = false
    let cloudShouldReplaceLocal = false

    try {
      cloudState = await fetchCloudAppState()
      hasCloudData =
        Boolean(cloudState?.planState) ||
        (Array.isArray(cloudState?.workoutLogs) && cloudState.workoutLogs.length > 0) ||
        (Array.isArray(cloudState?.restDays) && cloudState.restDays.length > 0)
      cloudShouldReplaceLocal = hasCloudData && isCloudAppStateNewerThanLocal(cloudState, localAppStateMeta)
    } catch (error) {
      console.error('Backend cloud hydrate failed', error)
    }

    if (!hasLocalData) {
      if (hasCloudData) {
        applyCloudAppStateToLocal(auth.user, cloudState)
        hydratedFromBackend = true
      }
    } else if (cloudShouldReplaceLocal) {
      applyCloudAppStateToLocal(auth.user, cloudState)
      hydratedFromBackend = true
    }

    if (!hasLocalData && !hydratedFromBackend) {
      try {
        await hydrateLocalDataFromSupabase()
      } catch (error) {
        console.error('Cloud hydrate failed', error)
      }
    }

    if (hasLocalData && !hydratedFromBackend && localStorage.getItem(backendKey) !== '1') {
      try {
        await saveLocalAppStateToCloud(auth.user)
        localStorage.setItem(backendKey, '1')
        syncCloudFlags(auth.user)
      } catch (error) {
        console.error('Backend cloud sync failed', error)
      }
    }

    if (localStorage.getItem(key) === '1') return
    syncInProgress.value = true
    try {
      const isLocalDevHost =
        typeof window !== 'undefined' &&
        ['localhost', '127.0.0.1'].includes(window.location.hostname)

      const result = await syncLocalDataToSupabase({
        interactive: !isLocalDevHost && !alreadyConnected
      })
      if (result?.status === 'done') {
        localStorage.setItem(key, '1')
        localStorage.setItem(connectedKey, '1')
        syncCloudFlags(auth.user)
      }
    } catch (error) {
      console.error('Cloud sync failed', error)
    } finally {
      syncInProgress.value = false
    }
  },
  { immediate: true }
)

function scheduleAutoSync() {
  if (!auth.user || isPublicGuestRoute.value) return
  if (syncTimer.value) {
    clearTimeout(syncTimer.value)
  }
  syncTimer.value = setTimeout(async () => {
    try {
      await saveLocalAppStateToCloud(auth.user)
      localStorage.setItem(backendSyncKeyForUser(auth.user), '1')
      syncCloudFlags(auth.user)
    } catch (error) {
      console.error('Backend cloud sync failed', error)
    }
    try {
      await syncLocalDataToSupabase({ interactive: false })
      localStorage.setItem(syncKeyForUser(auth.user), '1')
      localStorage.setItem(connectedKeyForUser(auth.user), '1')
      syncCloudFlags(auth.user)
    } catch (error) {
      console.error('Cloud sync failed', error)
    }
  }, 800)
}

let mediaQuery

function updateSystemTheme(event) {
  const isDark = event?.matches ?? false
  systemTheme.value = isDark ? 'dark' : 'light'
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    updateSystemTheme(mediaQuery)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateSystemTheme)
    } else {
      mediaQuery.addListener(updateSystemTheme)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pf_logs_updated', scheduleAutoSync)
    window.addEventListener('pf_plan_updated', scheduleAutoSync)
    window.addEventListener('pf_rest_updated', scheduleAutoSync)
    window.addEventListener('pf_nutrition_updated', scheduleAutoSync)
    window.addEventListener('storage', scheduleAutoSync)
  }
})

onBeforeUnmount(() => {
  if (mediaQuery) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', updateSystemTheme)
    } else {
      mediaQuery.removeListener(updateSystemTheme)
    }
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('pf_logs_updated', scheduleAutoSync)
    window.removeEventListener('pf_plan_updated', scheduleAutoSync)
    window.removeEventListener('pf_rest_updated', scheduleAutoSync)
    window.removeEventListener('pf_nutrition_updated', scheduleAutoSync)
    window.removeEventListener('storage', scheduleAutoSync)
  }
})
</script>

<style>
:root {
  color-scheme: light;
  --app-bg: linear-gradient(180deg, #f8fafc 0%, #eef2f8 100%);
  --surface: #ffffff;
  --surface-muted: #f8f9fc;
  --surface-soft: #f3f4f6;
  --surface-strong: #111827;
  --text-on-strong: #f9fafb;
  --border: #e5e7eb;
  --text-primary: #101828;
  --text-muted: #667085;
  --accent: #ef4444;
  --accent-soft: #ffe4e7;
  --accent-strong: #dc2626;
  --surface-track: #e4e7ec;
  --info-surface: #eff6ff;
  --info-soft: #dbeafe;
  --shadow-soft: 0 20px 40px rgba(15, 23, 42, 0.08);
  --shadow-strong: 0 28px 50px rgba(15, 23, 42, 0.12);
  --font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text',
    'Helvetica Neue', Arial, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display',
    'Helvetica Neue', Arial, sans-serif;
  --logo-filter: none;
  --logo-opacity: 1;
}

:root[data-theme='dark'] {
  color-scheme: dark;
  --app-bg: #111827;
  --surface: #111827;
  --surface-muted: #1f2937;
  --surface-soft: #111c2c;
  --surface-strong: #f9fafb;
  --text-on-strong: #111827;
  --border: #273247;
  --text-primary: #f9fafb;
  --text-muted: #9ca3af;
  --accent: #f87171;
  --accent-soft: #3b1f23;
  --accent-strong: #fca5a5;
  --surface-track: #1f2a3a;
  --info-surface: #0f2236;
  --info-soft: #1e3a5f;
  --shadow-soft: 0 20px 40px rgba(0, 0, 0, 0.4);
  --shadow-strong: 0 30px 60px rgba(0, 0, 0, 0.5);
  --logo-filter: brightness(0) invert(1);
  --logo-opacity: 0.94;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  background: var(--app-bg);
}

body {
  font-family: var(--font-body);
  background: var(--app-bg);
  color: var(--text-primary);
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font-family: inherit;
}

button,
.btn,
.icon-btn,
.row-action,
.chip {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
}

button:hover,
.btn:hover,
.icon-btn:hover,
.row-action:hover,
.chip:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
}

.app-frame {
  min-height: 100%;
  background: var(--app-bg);
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  background: var(--app-bg);
}

.app-main {
  min-height: 100vh;
  background: var(--app-bg);
}

.app-main.compact {
  display: block;
}

.route-loading {
  min-height: 100vh;
  padding: 28px;
}

.route-loading-shell {
  background: var(--app-bg);
}

.route-loading-compact {
  background: var(--app-bg);
}

.route-loading-card {
  width: min(100%, 920px);
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.route-loading-line {
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--surface-muted) 0%, var(--surface-soft) 50%, var(--surface-muted) 100%);
  background-size: 200% 100%;
  animation: route-loading-shimmer 1.2s linear infinite;
}

.route-loading-line + .route-loading-line {
  margin-top: 14px;
}

.route-loading-title {
  height: 28px;
  width: min(320px, 55%);
}

.route-loading-short {
  width: min(220px, 38%);
}

@keyframes route-loading-shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (min-width: 1280px) {
  .app-shell {
    grid-template-columns: 232px minmax(0, 1fr);
  }
}

@media (max-width: 980px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .route-loading {
    min-height: calc(100vh - 120px);
    padding: 18px;
  }

  .route-loading-card {
    padding: 22px;
    border-radius: 22px;
  }
}
</style>
