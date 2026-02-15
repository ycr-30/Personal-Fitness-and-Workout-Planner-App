<template>
  <section class="settings-page">
    <header class="settings-header">
      <div>
        <h1>Settings</h1>
        <p>Manage app preferences and display options.</p>
        <p v-if="saved" class="save-toast">Settings updated successfully.</p>
      </div>
      <div class="header-actions">
        <button class="btn ghost" type="button" @click="resetForm">Cancel</button>
        <button class="btn primary" type="button" @click="saveSettings">Save Changes</button>
      </div>
    </header>

    <section class="card">
      <header class="card-title">
        <div>
          <h3>App Preferences</h3>
          <p>Customize how FitPlanner behaves on your devices.</p>
        </div>
      </header>

      <div class="preferences">
        <div class="pref-row">
          <div>
            <strong>Unit System</strong>
            <p>Select your preferred measurement system.</p>
          </div>
          <div class="segmented">
            <button
              type="button"
              :class="['segment', { active: form.unit === 'metric' }]"
              @click="form.unit = 'metric'"
            >
              Metric
            </button>
            <button
              type="button"
              :class="['segment', { active: form.unit === 'imperial' }]"
              @click="form.unit = 'imperial'"
            >
              Imperial
            </button>
          </div>
        </div>

        <div class="pref-row">
          <div>
            <strong>Theme</strong>
            <p>Choose how the interface looks on this device.</p>
          </div>
          <div class="theme-toggle">
            <button
              type="button"
              :class="['theme', { active: form.theme === 'light' }]"
              @click="setTheme('light')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6" fill="none" />
                <path d="M12 3v3M12 18v3M4.5 4.5l2.2 2.2M17.3 17.3l2.2 2.2M3 12h3M18 12h3M4.5 19.5l2.2-2.2M17.3 6.7l2.2-2.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </button>
            <button
              type="button"
              :class="['theme', { active: form.theme === 'dark' }]"
              @click="setTheme('dark')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4a8 8 0 0 0 10.5 10.5z" stroke="currentColor" stroke-width="1.6" fill="none" />
              </svg>
            </button>
            <button
              type="button"
              :class="['theme', { active: form.theme === 'system' }]"
              @click="setTheme('system')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.6" fill="none" />
                <path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>

  </section>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const saved = ref(false)

const form = reactive({
  unit: 'metric',
  theme: 'light'
})

function setFormFromUser(user) {
  form.unit = user?.unit || 'metric'
  form.theme = user?.theme || 'light'
}

watch(
  () => auth.user,
  (user) => {
    if (user) setFormFromUser(user)
  },
  { immediate: true }
)

function resetForm() {
  if (auth.user) setFormFromUser(auth.user)
}

function saveSettings() {
  auth.updateProfile({
    unit: form.unit,
    theme: form.theme
  })
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}

function setTheme(theme) {
  form.theme = theme
  auth.updateProfile({ theme })
}
</script>

<style scoped>
.settings-page {
  padding: 36px clamp(20px, 4vw, 48px) 60px;
  display: grid;
  gap: 24px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.settings-header h1 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: clamp(28px, 3.4vw, 36px);
}

.settings-header p {
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

.card {
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
  padding: 20px;
  box-shadow: var(--shadow-soft);
  animation: fadeUp 0.6s ease both;
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

.preferences {
  margin-top: 16px;
  display: grid;
  gap: 16px;
}

.pref-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.pref-row strong {
  display: block;
  margin-bottom: 4px;
}

.pref-row p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
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

.segment.active {
  background: var(--surface-strong);
  color: var(--text-on-strong);
}

.theme-toggle {
  display: inline-flex;
  gap: 10px;
}

.theme {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  display: grid;
  place-items: center;
  color: var(--text-muted);
}

.theme svg {
  width: 18px;
  height: 18px;
}

.theme.active {
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2);
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
