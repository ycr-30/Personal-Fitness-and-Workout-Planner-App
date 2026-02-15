<template>
  <aside class="app-sidebar">
    <div class="brand">
      <img class="brand-logo" src="/photo/logo.png" alt="Keep Fit" />
    </div>

    <nav class="sidebar-nav">
      <RouterLink class="nav-link" to="/dashboard">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"
            fill="currentColor"
            fill-opacity="0.15"
          />
          <path
            d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
          />
        </svg>
        <span>Dashboard</span>
      </RouterLink>
      <RouterLink class="nav-link" to="/logs">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h12M6 12h12M6 18h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.4" fill="none" />
        </svg>
        <span>Workout Log</span>
      </RouterLink>
      <RouterLink class="nav-link" to="/plans">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.5" fill="none" />
          <path d="M8 3v4M16 3v4M7 11h10M7 15h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span>Schedule</span>
      </RouterLink>
      <RouterLink class="nav-link" to="/progress">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 15l4-4 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 19h16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
        <span>Analytics</span>
      </RouterLink>
      <RouterLink class="nav-link" to="/nutrition">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4v6M17 4v6M7 10v10M17 10v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          <path d="M12 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <span>Nutrition</span>
      </RouterLink>
      <RouterLink class="nav-link" to="/settings">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .33 1.87l.03.03a2 2 0 1 1-2.83 2.83l-.03-.03a1.7 1.7 0 0 0-1.87-.33 1.7 1.7 0 0 0-1.03 1.54V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.54 1.7 1.7 0 0 0-1.87.33l-.03.03a2 2 0 1 1-2.83-2.83l.03-.03a1.7 1.7 0 0 0 .33-1.87 1.7 1.7 0 0 0-1.54-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.54-1.03 1.7 1.7 0 0 0-.33-1.87l-.03-.03a2 2 0 1 1 2.83-2.83l.03.03a1.7 1.7 0 0 0 1.87.33 1.7 1.7 0 0 0 1.03-1.54V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.54 1.7 1.7 0 0 0 1.87-.33l.03-.03a2 2 0 1 1 2.83 2.83l-.03.03a1.7 1.7 0 0 0-.33 1.87 1.7 1.7 0 0 0 1.54 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.54 1.03z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Settings</span>
      </RouterLink>
    </nav>

    <div class="sidebar-bottom">
      <div class="goal-card">
        <span class="goal-title">Weekly Goal</span>
        <div class="goal-progress">
          <div class="goal-bar">
            <span :style="{ width: `${goalProgress}%` }"></span>
          </div>
          <span class="goal-count">{{ weeklyCompleted }}/{{ weeklyTotal }}</span>
        </div>
        <p>{{ goalMessage }}</p>
      </div>
      <UserMenu />
    </div>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UserMenu from '@/components/UserMenu.vue'
import { useAuthStore } from '@/stores/auth'
import { getUserStorageKey } from '@/lib/userStorage'

const auth = useAuthStore()
const storageKey = computed(() => getUserStorageKey('pf_workout_logs', auth.user))
const logs = ref([])

function loadLogs() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(storageKey.value)
  if (!raw) {
    logs.value = []
    return
  }
  try {
    const data = JSON.parse(raw)
    logs.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Failed to parse logs', err)
    logs.value = []
  }
}

const weeklyTotal = computed(() => {
  return logs.value.length
})

const weeklyCompleted = computed(() => {
  return logs.value.filter((item) => item.status === 'completed').length
})

const goalProgress = computed(() => {
  if (!weeklyTotal.value) return 0
  const progress = (weeklyCompleted.value / weeklyTotal.value) * 100
  return Math.min(100, Math.max(0, Math.round(progress)))
})

const goalMessage = computed(() => {
  if (weeklyTotal.value === 0) return 'No workouts scheduled yet.'
  if (weeklyCompleted.value < weeklyTotal.value) return 'Complete your scheduled sessions.'
  return 'All planned workouts completed.'
})

function handleStorage(event) {
  if (!event || event.key === storageKey.value) {
    loadLogs()
  }
}

onMounted(() => {
  loadLogs()
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
    window.addEventListener('pf_logs_updated', loadLogs)
  }
})

watch(
  storageKey,
  () => {
    loadLogs()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('pf_logs_updated', loadLogs)
  }
})
</script>

<style scoped>
.app-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 28px 22px 24px;
  gap: 28px;
  background: var(--surface);
  border-right: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  justify-content: center;
}

.brand-logo {
  width: 220px;
  height: auto;
  max-width: 100%;
  display: block;
  object-fit: contain;
}

.logo-mark {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 16px 30px rgba(239, 68, 68, 0.25);
}

.logo-mark svg {
  width: 24px;
  height: 24px;
}

.brand-copy {
  display: grid;
  gap: 2px;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.brand-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar-nav {
  display: grid;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 14px;
  color: #4b5563;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-link:hover {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.nav-link svg {
  width: 20px;
  height: 20px;
}

.nav-link.router-link-active {
  background: var(--accent-soft);
  color: var(--accent-strong);
  transform: translateX(2px);
}

.sidebar-bottom {
  margin-top: auto;
  display: grid;
  gap: 18px;
}

.goal-card {
  background: var(--surface-muted);
  border-radius: 18px;
  padding: 16px;
  border: 1px solid var(--border);
  display: grid;
  gap: 10px;
  box-shadow: var(--shadow-soft);
}

.goal-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.goal-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.goal-bar {
  flex: 1;
  height: 6px;
  background: var(--surface-track);
  border-radius: 999px;
  overflow: hidden;
}

.goal-bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}

.goal-count {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-strong);
}

.goal-card p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

@media (max-width: 980px) {
  .app-sidebar {
    position: relative;
    height: auto;
    flex-direction: row;
    align-items: center;
    gap: 20px;
    padding: 18px 20px;
    overflow-x: auto;
  }

  .brand {
    flex: none;
  }

  .sidebar-nav {
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    grid-template-columns: none;
    align-items: center;
    gap: 10px;
  }

  .sidebar-bottom {
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  .goal-card {
    display: none;
  }
}
</style>
