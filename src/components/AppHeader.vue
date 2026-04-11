<template>
  <aside class="app-sidebar">
    <RouterLink class="brand brand-link" to="/dashboard" aria-label="Go to dashboard">
      <img class="brand-logo" src="/photo/logo.png" alt="Keep Fit" />
    </RouterLink>

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
      <RouterLink class="nav-link" to="/schedule">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.5" fill="none" />
          <path d="M8 3v4M16 3v4M7 11h10M7 15h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span>Schedule</span>
      </RouterLink>
      <RouterLink class="nav-link" to="/plan">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M15 4v3h3M9 11h6M9 15h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span>Plan</span>
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
      <UserMenu />
    </div>
  </aside>
</template>

<script setup>
import UserMenu from '@/components/UserMenu.vue'
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

.brand-link {
  text-decoration: none;
}

.brand-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 10px;
}

.brand-logo {
  width: 220px;
  height: auto;
  max-width: 100%;
  display: block;
  object-fit: contain;
  filter: var(--logo-filter, none);
  opacity: var(--logo-opacity, 1);
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
  gap: 0;
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
}
</style>
