<template>
  <div class="app-frame">
    <div v-if="showShell" class="app-shell">
      <AppHeader />
      <main class="app-main">
        <RouterView />
      </main>
    </div>
    <main v-else class="app-main compact">
      <RouterView />
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
import { syncLocalDataToSupabase, hydrateLocalDataFromSupabase } from '@/lib/supabaseSync'
import { applyCloudAppStateToLocal, fetchCloudAppState, saveLocalAppStateToCloud } from '@/lib/cloudStateApi'
import { getIdentityFromUser, getUserStorageKey } from '@/lib/userStorage'

const route = useRoute()
const auth = useAuthStore()
auth.init()

const hideShell = computed(() => route.meta?.hideShell)
const showShell = computed(() => auth.isAuthed && !hideShell.value)
const showCoachChat = computed(() => auth.isAuthed && route.name === 'dashboard')
const systemTheme = ref('light')
const syncInProgress = ref(false)
const syncTimer = ref(null)
const authIdentity = computed(() => auth.user?.account || auth.user?.email || auth.user?.name || null)

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

const preferredTheme = computed(() => auth.user?.theme || 'light')
const resolvedTheme = computed(() =>
  preferredTheme.value === 'system' ? systemTheme.value : preferredTheme.value
)

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

watch(resolvedTheme, (theme) => {
  applyTheme(theme)
}, { immediate: true })

watch(
  authIdentity,
  async (identity) => {
    if (!identity || !auth.user || syncInProgress.value) return
    const key = syncKeyForUser(auth.user)
    const connectedKey = connectedKeyForUser(auth.user)
    const backendKey = backendSyncKeyForUser(auth.user)
    const alreadyConnected = localStorage.getItem(connectedKey) === '1'

    const hasLocalData =
      localStorage.getItem(getUserStorageKey('pf_plan_state', auth.user)) ||
      localStorage.getItem(getUserStorageKey('pf_workout_logs', auth.user)) ||
      localStorage.getItem(getUserStorageKey('pf_rest_days', auth.user))

    let hydratedFromBackend = false
    if (!hasLocalData) {
      try {
        const cloudState = await fetchCloudAppState()
        const hasCloudData =
          cloudState?.planState ||
          (Array.isArray(cloudState?.workoutLogs) && cloudState.workoutLogs.length > 0) ||
          (Array.isArray(cloudState?.restDays) && cloudState.restDays.length > 0)
        if (hasCloudData) {
          applyCloudAppStateToLocal(auth.user, cloudState)
          hydratedFromBackend = true
        }
      } catch (error) {
        console.error('Backend cloud hydrate failed', error)
      }

      if (!hydratedFromBackend) {
        try {
          await hydrateLocalDataFromSupabase()
        } catch (error) {
          console.error('Cloud hydrate failed', error)
        }
      }
    }

    if (hasLocalData && localStorage.getItem(backendKey) !== '1') {
      try {
        await saveLocalAppStateToCloud(auth.user)
        localStorage.setItem(backendKey, '1')
      } catch (error) {
        console.error('Backend cloud sync failed', error)
      }
    }

    if (localStorage.getItem(key) === '1') return
    syncInProgress.value = true
    try {
      const result = await syncLocalDataToSupabase({ interactive: !alreadyConnected })
      if (result?.status === 'done') {
        localStorage.setItem(key, '1')
        localStorage.setItem(connectedKey, '1')
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
  if (!auth.user) return
  if (syncTimer.value) {
    clearTimeout(syncTimer.value)
  }
  syncTimer.value = setTimeout(async () => {
    try {
      await saveLocalAppStateToCloud(auth.user)
    } catch (error) {
      console.error('Backend cloud sync failed', error)
    }
    try {
      await syncLocalDataToSupabase({ interactive: false })
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
  if (typeof window === 'undefined' || !window.matchMedia) return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  updateSystemTheme(mediaQuery)
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', updateSystemTheme)
  } else {
    mediaQuery.addListener(updateSystemTheme)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pf_logs_updated', scheduleAutoSync)
    window.addEventListener('pf_plan_updated', scheduleAutoSync)
    window.addEventListener('pf_rest_updated', scheduleAutoSync)
    window.addEventListener('storage', scheduleAutoSync)
  }
})

onBeforeUnmount(() => {
  if (!mediaQuery) return
  if (mediaQuery.removeEventListener) {
    mediaQuery.removeEventListener('change', updateSystemTheme)
  } else {
    mediaQuery.removeListener(updateSystemTheme)
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('pf_logs_updated', scheduleAutoSync)
    window.removeEventListener('pf_plan_updated', scheduleAutoSync)
    window.removeEventListener('pf_rest_updated', scheduleAutoSync)
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
  --app-bg: linear-gradient(180deg, #0b1120 0%, #111827 100%);
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
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  background: transparent;
}

.app-main {
  min-height: 100vh;
  background: transparent;
}

.app-main.compact {
  display: block;
}

@media (max-width: 980px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}
</style>
