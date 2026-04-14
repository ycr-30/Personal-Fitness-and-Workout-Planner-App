<template>
  <main class="legal-page">
    <header class="legal-header">
      <div class="shell header-shell">
        <RouterLink class="brand" to="/">
          <img class="brand-logo brand-logo-square" src="/photo/keep-fit-icon-square.png" alt="Keep Fit" />
          <span class="brand-copy">
            <strong>KEEP FIT</strong>
            <span>Fitness AI Planner</span>
          </span>
        </RouterLink>

        <div class="header-actions">
          <RouterLink class="header-link" to="/">Home</RouterLink>
          <RouterLink class="header-link" to="/login">Sign in</RouterLink>
          <RouterLink class="btn btn-primary" to="/register">Get started</RouterLink>
        </div>
      </div>
    </header>

    <section class="shell legal-hero">
      <span class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p class="hero-intro">{{ intro }}</p>
      <p class="last-updated">Last updated: {{ lastUpdated }}</p>
    </section>

    <article class="shell legal-surface">
      <slot />
    </article>

    <footer class="legal-footer">
      <div class="shell footer-shell">
        <p class="footer-description">
          Fitness AI Planner provides planning and educational guidance, not medical diagnosis or treatment.
        </p>

        <div class="footer-links">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/privacy">Privacy</RouterLink>
          <RouterLink to="/terms">Terms</RouterLink>
          <RouterLink to="/disclaimer">Disclaimer</RouterLink>
        </div>
      </div>
    </footer>
  </main>
</template>

<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: 'PUBLIC INFORMATION'
  },
  title: {
    type: String,
    required: true
  },
  intro: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.legal-page {
  --legal-bg: #f7f8fb;
  --legal-surface: #ffffff;
  --legal-text: #121826;
  --legal-muted: #667085;
  --legal-border: #e7ecf3;
  --legal-coral: #ff5a5f;
  min-height: 100vh;
  background: var(--legal-bg);
  color: var(--legal-text);
  padding-bottom: 42px;
}

.shell {
  width: min(100% - 40px, 960px);
  margin: 0 auto;
}

.legal-header {
  position: sticky;
  top: 0;
  z-index: 30;
  padding: 3px 0 0;
}

.header-shell {
  width: min(100% - 40px, 1200px);
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 9px;
  border: 1px solid rgba(231, 236, 243, 0.36);
  border-radius: 16px;
  background: rgba(247, 248, 251, 0.66);
  box-shadow: 0 2px 6px rgba(18, 24, 38, 0.012);
  backdrop-filter: blur(8px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: inherit;
  text-decoration: none;
}

.brand-logo {
  width: 60px;
  max-width: 100%;
  display: block;
}

.brand-logo-square {
  width: 25px;
  border-radius: 8px;
}

.brand-copy {
  display: grid;
  gap: 1px;
}

.brand-copy strong {
  font-size: 11px;
  line-height: 1.1;
  letter-spacing: 0.08em;
}

.brand-copy span:last-child {
  color: var(--legal-muted);
  font-size: 10px;
  line-height: 1.2;
}

.header-actions,
.footer-links {
  display: flex;
  align-items: center;
  gap: 8px 14px;
}

.header-link,
.footer-links a {
  color: var(--legal-muted);
  text-decoration: none;
  font-size: 11.5px;
  font-weight: 600;
}

.header-link:hover,
.footer-links a:hover {
  color: var(--legal-text);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 31px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--legal-border);
  text-decoration: none;
  font-size: 11px;
  font-weight: 700;
}

.btn-primary {
  border-color: rgba(255, 90, 95, 0.14);
  background: rgba(255, 90, 95, 0.07);
  color: var(--legal-coral);
  box-shadow: none;
}

.legal-hero {
  display: grid;
  gap: 14px;
  padding-top: 54px;
}

.eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #4b7bff;
}

.legal-hero h1 {
  margin: 0;
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.hero-intro,
.last-updated,
:deep(p),
:deep(li) {
  color: var(--legal-muted);
  font-size: 17px;
  line-height: 1.72;
}

.hero-intro,
.last-updated {
  margin: 0;
}

.legal-surface {
  margin-top: 28px;
  padding: 34px;
  border: 1px solid var(--legal-border);
  border-radius: 28px;
  background: var(--legal-surface);
  box-shadow: 0 24px 64px rgba(18, 24, 38, 0.06);
}

:deep(section + section) {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid var(--legal-border);
}

:deep(h2) {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.2;
  color: var(--legal-text);
}

:deep(p) {
  margin: 0;
}

:deep(p + p),
:deep(p + ul),
:deep(ul + p) {
  margin-top: 12px;
}

:deep(ul) {
  margin: 0;
  padding-left: 22px;
}

:deep(li + li) {
  margin-top: 8px;
}

:deep(strong) {
  color: var(--legal-text);
}

.legal-footer {
  padding-top: 26px;
}

.footer-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--legal-border);
}

.footer-description {
  margin: 0;
  max-width: 48ch;
  color: var(--legal-muted);
  font-size: 14px;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .header-shell,
  .footer-shell {
    flex-wrap: wrap;
    justify-content: center;
  }

  .brand {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 720px) {
  .shell {
    width: min(100% - 24px, 960px);
  }

  .header-actions,
  .footer-links {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .legal-surface {
    padding: 24px 20px;
    border-radius: 24px;
  }

  .hero-intro,
  .last-updated,
  :deep(p),
  :deep(li) {
    font-size: 16px;
  }
}
</style>
