<template>
  <main class="landing-page" :style="landingStyle">
    <header ref="navRef" class="landing-nav">
      <div class="shell nav-shell">
        <RouterLink class="brand" to="/">
          <img class="brand-logo" src="/photo/logo.png" alt="Keep Fit" />
          <span class="brand-copy">
            <strong>KEEP FIT</strong>
            <span>Fitness AI Planner</span>
          </span>
        </RouterLink>

        <nav class="nav-links" aria-label="Landing sections">
          <a
            v-for="link in navLinks"
            :key="link.id"
            :href="`#${link.id}`"
            class="nav-link"
            :class="{ active: activeSection === link.id }"
            @click.prevent="scrollToSection(link.id)"
          >
            {{ link.label }}
          </a>
        </nav>

        <div class="nav-actions">
          <RouterLink class="btn btn-ghost nav-btn" to="/login">Sign in</RouterLink>
          <RouterLink class="btn btn-primary nav-btn" to="/register">Get started</RouterLink>
        </div>
      </div>
    </header>

    <section class="shell hero-section">
      <div class="hero-copy">
        <span class="eyebrow">FITNESS AI PLANNER</span>
        <h1>Grounded AI for training and nutrition.</h1>
        <p class="hero-body">
          Planning, coaching, analytics, and meal logging in one calmer system.
        </p>
        <p class="hero-core">
          Muscle planning · AI coach · Analytics · Meals
        </p>
      </div>

      <div class="hero-proof" aria-hidden="true">
        <div class="proof-halo proof-halo-blue"></div>
        <div class="proof-halo proof-halo-coral"></div>

        <div class="proof-stage">
          <article class="proof-card coach-card">
            <div class="card-head">
              <div class="card-title">
                <span class="card-kicker">AI Weekly Coach</span>
                <strong>Grounded weekly adjustment</strong>
              </div>
              <span class="card-badge badge-neutral badge-wide">Training · Recovery · Nutrition · Body</span>
            </div>

            <p class="coach-summary">
              One grounded weekly adjustment tied to your workouts, recovery, body logs, and meals.
            </p>

            <div class="coach-recommendations">
              <article class="coach-block tone-coral-soft">
                <strong>Training</strong>
                <p>Bias upper-back and rear-delt volume.</p>
              </article>
              <article class="coach-block tone-success-soft">
                <strong>Recovery</strong>
                <p>Keep one lighter day and hold the week steady.</p>
              </article>
            </div>

            <div class="coach-proof">
              <span>Based on your last 7 days</span>
              <strong>Ready for this week</strong>
            </div>
          </article>

          <article class="proof-card muscle-card">
            <div class="card-head muscle-head">
              <div class="card-title">
                <span class="card-kicker">Muscle Map Builder</span>
                <strong>Back cluster focus</strong>
              </div>
            </div>

            <LandingMuscleMapMockup variant="hero" />
            <p class="muscle-proof-note">Rear delts · Upper back · Lats</p>
          </article>
        </div>
      </div>
    </section>

    <section id="features" class="shell landing-section anchor-section">
      <div class="section-head features-head">
        <span class="eyebrow">WHY FITNESS AI PLANNER</span>
        <h2>Built around the decisions you actually need to make.</h2>
        <p class="section-subtitle">
          The system ties AI guidance, muscle targeting, training adherence, and meal
          logging into one calmer weekly workflow.
        </p>
      </div>

      <div class="feature-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card">
          <div class="feature-icon" :class="feature.tone">
            <svg v-if="feature.icon === 'spark'" viewBox="0 0 24 24">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"></path>
            </svg>
            <svg v-else-if="feature.icon === 'target'" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="7"></circle>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19 5l-3 3"></path>
            </svg>
            <svg v-else-if="feature.icon === 'chart'" viewBox="0 0 24 24">
              <path d="M5 16V9"></path>
              <path d="M10 16V5"></path>
              <path d="M15 16v-4"></path>
              <path d="M20 16V7"></path>
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <path d="M7 5.5h10"></path>
              <path d="M7 10.5h10"></path>
              <path d="M7 15.5h5"></path>
              <path d="M17 5.5v10"></path>
            </svg>
          </div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.body }}</p>
        </article>
      </div>
    </section>

    <section id="preview" class="shell landing-section anchor-section preview-section">
      <div class="section-head preview-head">
        <span class="eyebrow">PRODUCT PROOF</span>
        <h2>See the system, not just the pitch.</h2>
        <p class="section-subtitle">
          Fitness AI Planner combines AI guidance, muscle-cluster planning, training
          analytics, meal logging, and nutrition trends in one connected surface.
        </p>
      </div>

      <div class="proof-row proof-row-guidance">
        <div class="proof-copy guidance-copy">
          <span class="eyebrow">AI GUIDANCE</span>
          <h3>Weekly coaching and chat stay tied to your actual logs</h3>
          <p>
            The AI coach reviews workouts, recovery, body logs, and meals before it suggests
            the next weekly adjustment or answers your question.
          </p>
        </div>

        <div class="proof-visual" aria-hidden="true">
          <div class="ai-guidance-cluster">
            <article class="proof-card recommendation-card">
              <div class="preview-toolbar">
                <div class="recommendation-heading">
                  <span class="preview-pill coral">AI Weekly Coach</span>
                  <strong>Weekly adjustment</strong>
                </div>
                <span class="preview-pill muted">This week</span>
              </div>

              <p class="recommendation-summary">
                One concise recommendation surface tied to your actual logs.
              </p>

              <div class="recommendation-stack">
                <div class="recommendation-item">
                  <strong>Training</strong>
                  <span>Keep upper-back volume and trim one lower-priority accessory block.</span>
                </div>
                <div class="recommendation-item">
                  <strong>Nutrition</strong>
                  <span>Raise protein on heavy days and keep hydration steady.</span>
                </div>
                <div class="recommendation-item">
                  <strong>Recovery</strong>
                  <span>Place one lighter day after your peak load session.</span>
                </div>
              </div>

              <div class="recommendation-foot">
                <span>Signals from workouts, body logs, meals, and recovery.</span>
                <strong>Change this week, not everything.</strong>
              </div>
            </article>

            <LandingAiChatMockup class="chat-proof-card" />
          </div>
        </div>
      </div>

      <div class="proof-row proof-row-alt">
        <div class="proof-visual" aria-hidden="true">
          <article class="proof-card muscle-surface-card">
            <div class="surface-head">
              <div class="card-title">
                <span class="card-kicker">Muscle Map Builder</span>
                <strong>Targeted back session</strong>
              </div>
              <span class="preview-pill muted">Back view</span>
            </div>

            <LandingMuscleMapMockup variant="preview" />
          </article>
        </div>

        <div class="proof-copy proof-copy-centered proof-copy-right">
          <span class="eyebrow">MUSCLE TARGETING</span>
          <h3>Choose the muscle cluster, then build the session</h3>
          <p>
            Instead of browsing generic templates, you can choose rear delts, upper back,
            lats, and other targets directly from the muscle map.
          </p>
        </div>
      </div>

      <div class="proof-row proof-row-system">
        <div class="proof-copy proof-copy-centered">
          <span class="eyebrow">CONNECTED TRACKING</span>
          <h3>Training analytics, meal logs, and food entry live in one system</h3>
          <p>
            Review adherence, session output, meal-level macros, and daily nutrition trends
            without jumping between disconnected tools.
          </p>
        </div>

        <div class="proof-visual" aria-hidden="true">
          <div class="system-proof-grid">
            <LandingTrainingAnalyticsMockup class="system-proof-card analytics-proof-card" />
            <LandingNutritionSystemMockup class="system-proof-card nutrition-proof-card" />
          </div>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="shell landing-section anchor-section how-section">
      <div class="section-head secondary-section-head">
        <span class="eyebrow">HOW IT WORKS</span>
        <h2>How Fitness AI Planner works</h2>
        <p class="section-subtitle">
          Set the goal, build the right session, log what really happened, and let the
          system connect training and nutrition into next-week guidance.
        </p>
      </div>

      <div class="steps-grid">
        <article v-for="step in steps" :key="step.number" class="step-card">
          <span class="step-number">{{ step.number }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.body }}</p>
        </article>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="shell footer-shell">
        <div class="footer-top">
          <RouterLink class="brand footer-brand" to="/">
            <img class="brand-logo" src="/photo/logo.png" alt="Keep Fit" />
            <span class="brand-copy">
              <strong>KEEP FIT</strong>
              <span>Fitness AI Planner</span>
            </span>
          </RouterLink>

          <div class="footer-links">
            <RouterLink to="/login">Sign in</RouterLink>
            <RouterLink to="/register">Get started</RouterLink>
            <RouterLink to="/privacy">Privacy</RouterLink>
            <RouterLink to="/terms">Terms</RouterLink>
            <RouterLink to="/disclaimer">Disclaimer</RouterLink>
          </div>
        </div>

        <p class="footer-note">
          AI planning and educational guidance only, not medical diagnosis or treatment.
        </p>
      </div>
    </footer>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import LandingAiChatMockup from '@/components/landing/LandingAiChatMockup.vue'
import LandingMuscleMapMockup from '@/components/landing/LandingMuscleMapMockup.vue'
import LandingNutritionSystemMockup from '@/components/landing/LandingNutritionSystemMockup.vue'
import LandingTrainingAnalyticsMockup from '@/components/landing/LandingTrainingAnalyticsMockup.vue'

const navRef = ref(null)
const navOffset = ref(112)
const activeSection = ref('features')
const sectionOrder = ['features', 'preview', 'how-it-works']
const sectionElements = new Map()
let sectionObserver = null
let resizeHandler = null
let hashChangeHandler = null
let scrollHandler = null

const navLinks = [
  { label: 'Features', id: 'features' },
  { label: 'Preview', id: 'preview' },
  { label: 'How it works', id: 'how-it-works' }
]

const features = [
  {
    title: 'Multi-agent AI coach',
    body: 'Training, recovery, body trends, and meals are reviewed before one grounded recommendation is produced.',
    icon: 'spark',
    tone: 'tone-coral'
  },
  {
    title: 'Muscle-cluster session builder',
    body: 'Choose the target cluster from the muscle map and build the right session instead of browsing generic templates.',
    icon: 'target',
    tone: 'tone-blue'
  },
  {
    title: 'Training analytics and adherence',
    body: 'Review completion, minutes, streaks, and body-trend context so weekly decisions stay anchored.',
    icon: 'chart',
    tone: 'tone-green'
  },
  {
    title: 'Meal logging and nutrition intelligence',
    body: 'Track meals, food entries, and daily macro trends inside the same system.',
    icon: 'list',
    tone: 'tone-soft'
  }
]

const steps = [
  {
    number: '1',
    title: 'Choose the target and shape the week',
    body: 'Pick the muscle focus, set direction, and build around what matters most.'
  },
  {
    number: '2',
    title: 'Log what actually happened',
    body: 'Workouts, meals, hydration, and body signals create the evidence the system uses.'
  },
  {
    number: '3',
    title: 'Adjust next week from real data',
    body: 'Use analytics and grounded AI guidance to change the plan without guessing.'
  }
]

const landingStyle = computed(() => ({
  '--landing-anchor-offset': `${navOffset.value}px`
}))

function updateNavOffset() {
  const headerHeight = navRef.value?.getBoundingClientRect().height || 84
  navOffset.value = Math.round(headerHeight + 16)
}

function getSectionElement(id) {
  if (sectionElements.has(id)) return sectionElements.get(id)
  const element = typeof document !== 'undefined' ? document.getElementById(id) : null
  if (element) sectionElements.set(id, element)
  return element
}

function updateActiveSectionByPosition() {
  if (typeof window === 'undefined') return
  const threshold = navOffset.value + 30
  let current = ''

  for (const id of sectionOrder) {
    const element = getSectionElement(id)
    if (!element) continue
    const absoluteTop = element.getBoundingClientRect().top + window.scrollY
    if (window.scrollY + threshold >= absoluteTop) current = id
  }

  activeSection.value = current || 'features'
}

function scrollToSection(id, smooth = true) {
  if (typeof window === 'undefined') return
  const target = getSectionElement(id)
  if (!target) return

  updateNavOffset()
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - navOffset.value)
  activeSection.value = id

  window.scrollTo({
    top,
    behavior: smooth ? 'smooth' : 'auto'
  })

  const url = `${window.location.pathname}${window.location.search}#${id}`
  window.history.replaceState(window.history.state, '', url)
}

async function scrollFromHash(smooth = false) {
  if (typeof window === 'undefined') return
  const hash = window.location.hash.replace('#', '')

  if (!hash) {
    updateActiveSectionByPosition()
    return
  }

  if (!sectionOrder.includes(hash)) {
    if (hash === 'privacy' || hash === 'contact') {
      window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
    }
    updateActiveSectionByPosition()
    return
  }

  await nextTick()
  window.requestAnimationFrame(() => {
    scrollToSection(hash, smooth)
  })
}

function setupSectionObserver() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
  if (sectionObserver) sectionObserver.disconnect()

  sectionObserver = new window.IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

      if (visibleEntries.length > 0) {
        activeSection.value = visibleEntries[0].target.id
      } else {
        updateActiveSectionByPosition()
      }
    },
    {
      root: null,
      rootMargin: `-${navOffset.value}px 0px -48% 0px`,
      threshold: [0.2, 0.35, 0.55, 0.75]
    }
  )

  sectionOrder.forEach((id) => {
    const element = getSectionElement(id)
    if (element) sectionObserver.observe(element)
  })
}

onMounted(async () => {
  updateNavOffset()
  sectionOrder.forEach((id) => {
    getSectionElement(id)
  })

  resizeHandler = () => {
    updateNavOffset()
    setupSectionObserver()
    updateActiveSectionByPosition()
  }

  hashChangeHandler = () => {
    scrollFromHash(false)
  }

  scrollHandler = () => {
    updateActiveSectionByPosition()
  }

  window.addEventListener('resize', resizeHandler)
  window.addEventListener('hashchange', hashChangeHandler)
  window.addEventListener('scroll', scrollHandler, { passive: true })

  setupSectionObserver()
  await scrollFromHash(false)
  updateActiveSectionByPosition()
})

onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (hashChangeHandler) window.removeEventListener('hashchange', hashChangeHandler)
  if (scrollHandler) window.removeEventListener('scroll', scrollHandler)
  if (sectionObserver) sectionObserver.disconnect()
})
</script>

<style scoped>
.landing-page {
  --landing-bg: #f7f8fb;
  --landing-surface: #ffffff;
  --landing-text: #121826;
  --landing-muted: #667085;
  --landing-border: #e7ecf3;
  --landing-border-strong: #d8dfeb;
  --landing-coral: #ff5a5f;
  --landing-blue: #4b7bff;
  --landing-green: #1f9254;
  --landing-success: #dff7ea;
  --landing-shadow: 0 18px 42px rgba(18, 24, 38, 0.045);
  --landing-shadow-soft: 0 12px 24px rgba(18, 24, 38, 0.032);
  --landing-nav-height: 58px;
  min-height: 100vh;
  background: var(--landing-bg);
  color: var(--landing-text);
  position: relative;
  overflow-x: clip;
}

.landing-page::before,
.landing-page::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(30px);
  opacity: 0.42;
}

.landing-page::before {
  top: 132px;
  right: min(12vw, 176px);
  width: 216px;
  height: 216px;
  background: rgba(75, 123, 255, 0.09);
}

.landing-page::after {
  top: 260px;
  left: min(8vw, 124px);
  width: 176px;
  height: 176px;
  background: rgba(255, 90, 95, 0.07);
}

.shell {
  width: min(100% - 40px, 1200px);
  margin: 0 auto;
}

.landing-nav {
  position: sticky;
  top: 0;
  z-index: 30;
  padding: 6px 0 0;
}

.nav-shell {
  min-height: var(--landing-nav-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 11px;
  border: 1px solid rgba(231, 236, 243, 0.62);
  border-radius: 18px;
  background: rgba(247, 248, 251, 0.66);
  box-shadow: 0 5px 12px rgba(18, 24, 38, 0.026);
  backdrop-filter: blur(9px);
}

.brand,
.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

.brand-logo {
  width: 68px;
  max-width: 100%;
  display: block;
}

.brand-copy {
  display: grid;
  gap: 1px;
}

.brand-copy strong {
  font-size: 10px;
  line-height: 1.1;
  letter-spacing: 0.08em;
}

.brand-copy span:last-child {
  color: var(--landing-muted);
  font-size: 9px;
  line-height: 1.2;
}

.nav-links,
.nav-actions,
.hero-actions,
.footer-links {
  display: flex;
  align-items: center;
}

.nav-links {
  gap: 4px;
}

.nav-actions,
.hero-actions {
  gap: 8px;
}

.footer-links {
  gap: 12px 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 8px;
  border-radius: 12px;
  border: 1px solid transparent;
  text-decoration: none;
  color: var(--landing-muted);
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.nav-link:hover,
.footer-links a:hover {
  color: var(--landing-text);
}

.nav-link.active {
  color: var(--landing-text);
  background: rgba(255, 255, 255, 0.84);
  border-color: rgba(231, 236, 243, 0.76);
  box-shadow: 0 3px 8px rgba(18, 24, 38, 0.026);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid var(--landing-border);
  text-decoration: none;
  font-size: 15px;
  font-weight: 700;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.nav-btn {
  min-height: 36px;
  padding: 0 12px;
  font-size: 12px;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.78);
  color: var(--landing-text);
}

.btn-primary {
  border-color: transparent;
  background: var(--landing-coral);
  color: #fff;
  box-shadow: 0 12px 24px rgba(255, 90, 95, 0.15);
}

.nav-actions .btn-ghost {
  background: rgba(255, 255, 255, 0.54);
}

.nav-actions .btn-primary {
  box-shadow: 0 5px 12px rgba(255, 90, 95, 0.085);
}

.hero-section {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding-top: clamp(22px, 3vw, 34px);
  padding-bottom: 8px;
}

.hero-copy {
  display: grid;
  gap: 10px;
  align-content: start;
  justify-items: center;
  text-align: center;
  max-width: 42rem;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--landing-blue);
}

.hero-copy h1,
.section-head h2,
.final-cta h2 {
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.hero-copy h1 {
  max-width: 11.6ch;
  font-size: clamp(28px, 2.65vw, 40px);
  line-height: 1.06;
}

.hero-body,
.proof-copy p,
.step-card p,
.final-cta p,
.section-subtitle {
  margin: 0;
  font-size: 17px;
  line-height: 1.62;
  color: var(--landing-muted);
}

.hero-body {
  max-width: 32rem;
  font-size: 15px;
  line-height: 1.52;
}

.hero-core {
  margin: 0;
  color: var(--landing-muted);
  font-size: 11px;
  line-height: 1.45;
  letter-spacing: 0.04em;
}

.hero-proof {
  position: relative;
  justify-self: center;
  align-self: start;
  width: min(100%, 760px);
  padding-top: 2px;
}

.proof-halo {
  position: absolute;
  border-radius: 999px;
  filter: blur(16px);
  pointer-events: none;
}

.proof-halo-blue {
  top: 20px;
  right: 20px;
  width: 156px;
  height: 156px;
  background: rgba(75, 123, 255, 0.1);
}

.proof-halo-coral {
  left: 10px;
  bottom: 22px;
  width: 136px;
  height: 136px;
  background: rgba(255, 90, 95, 0.08);
}

.proof-stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.78fr);
  gap: 14px;
  align-items: stretch;
  min-height: 0;
  padding: 4px 0 0;
}

.proof-card,
.feature-card,
.recommendation-card,
.muscle-surface-card,
.step-card,
.final-cta {
  border: 1px solid var(--landing-border);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: var(--landing-shadow);
}

.coach-card {
  position: relative;
  z-index: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  padding: 18px 18px 14px;
  display: grid;
  gap: 10px;
}

.muscle-card {
  position: relative;
  z-index: 2;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 12px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 8px;
  align-content: stretch;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 10px 22px rgba(18, 24, 38, 0.04);
}

.muscle-card :deep(.landing-muscle-map),
.muscle-card :deep(.hero-shell),
.muscle-card :deep(.svg-stage) {
  height: 100%;
  min-height: 0;
}

.card-head,
.preview-toolbar,
.surface-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.coach-card .card-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-content: start;
  gap: 8px;
}

.card-title,
.recommendation-heading {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.card-head strong,
.surface-head strong {
  margin: 0;
  font-size: 16px;
  line-height: 1.16;
}

.coach-card .card-head strong {
  font-size: 17px;
}

.muscle-head .card-title {
  gap: 3px;
}

.muscle-head strong {
  font-size: 15px;
}

.feature-card h3,
.step-card h3 {
  margin: 0;
  font-size: 17px;
  line-height: 1.2;
}

.card-kicker {
  font-size: 10px;
  line-height: 1;
  color: var(--landing-muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
}

.card-badge,
.preview-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.badge-coral,
.preview-pill.coral {
  background: rgba(255, 90, 95, 0.12);
  color: var(--landing-coral);
}

.badge-neutral {
  background: rgba(102, 112, 133, 0.08);
  color: #667085;
}

.badge-wide {
  padding-inline: 10px;
  font-size: 9px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.coach-card .card-badge {
  justify-self: start;
  max-width: 100%;
  padding: 4px 9px;
  white-space: nowrap;
  text-align: left;
  line-height: 1.2;
}

.preview-pill.blue {
  background: rgba(75, 123, 255, 0.12);
  color: var(--landing-blue);
}

.preview-pill.muted {
  background: #f4f6fb;
  color: var(--landing-muted);
}

.coach-summary,
.recommendation-summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.48;
  color: var(--landing-muted);
}

.coach-summary {
  max-width: 280px;
}

.coach-recommendations,
.recommendation-stack {
  display: grid;
  gap: 6px;
}

.coach-recommendations,
.coach-proof {
  max-width: 280px;
}

.coach-block,
.recommendation-item {
  border: 1px solid var(--landing-border);
  border-radius: 18px;
  background: #fcfdff;
  padding: 10px 11px;
  display: grid;
  gap: 4px;
}

.coach-block strong,
.recommendation-item strong {
  font-size: 13px;
  line-height: 1.3;
}

.coach-block p,
.recommendation-item span {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--landing-muted);
}

.tone-coral-soft {
  background: rgba(255, 90, 95, 0.06);
}

.tone-blue-soft {
  background: rgba(75, 123, 255, 0.06);
}

.tone-success-soft {
  background: rgba(223, 247, 234, 0.55);
}

.coach-proof,
.recommendation-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.coach-proof span,
.recommendation-foot span {
  font-size: 11px;
  line-height: 1.45;
  color: var(--landing-muted);
}

.coach-proof strong,
.recommendation-foot strong {
  font-size: 12px;
  line-height: 1.2;
}

.muscle-proof-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--landing-muted);
  text-align: center;
}

.landing-section {
  padding-top: 68px;
}

.section-head {
  display: grid;
  gap: 8px;
  max-width: 740px;
  margin-bottom: 22px;
}

.features-head {
  max-width: 980px;
  margin-inline: auto;
  justify-items: center;
  text-align: center;
}

.preview-head,
.secondary-section-head {
  max-width: 980px;
  margin-inline: auto;
  justify-items: center;
  text-align: center;
}

.section-head h2,
.final-cta h2 {
  font-size: clamp(28px, 2.8vw, 36px);
  line-height: 1.08;
}

.features-head h2 {
  white-space: nowrap;
  font-size: clamp(28px, 2.55vw, 34px);
}

.features-head .section-subtitle {
  max-width: 760px;
}

.preview-head .section-subtitle,
.secondary-section-head .section-subtitle {
  max-width: 760px;
}

.feature-grid,
.steps-grid {
  display: grid;
  gap: 14px;
}

.feature-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-width: 1040px;
  margin-inline: auto;
}

.feature-card {
  min-height: 184px;
  padding: 18px;
  display: grid;
  gap: 11px;
}

.feature-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
}

.feature-icon svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.feature-icon.tone-coral {
  color: var(--landing-coral);
  background: rgba(255, 90, 95, 0.11);
}

.feature-icon.tone-blue {
  color: var(--landing-blue);
  background: rgba(75, 123, 255, 0.11);
}

.feature-icon.tone-green {
  color: var(--landing-green);
  background: rgba(223, 247, 234, 0.92);
}

.feature-icon.tone-soft {
  color: #667085;
  background: #f4f6fb;
}

.feature-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.54;
  color: var(--landing-muted);
}

.preview-section {
  display: grid;
  gap: 24px;
}

.proof-row {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 24px;
  align-items: center;
}

.proof-row-alt {
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
  gap: clamp(34px, 4.6vw, 62px);
}

.proof-row-guidance {
  align-items: center;
}

.proof-copy {
  display: grid;
  gap: 9px;
  align-content: start;
  max-width: 36rem;
}

.guidance-copy {
  align-self: center;
}

.proof-copy-centered {
  align-self: center;
  max-width: 34rem;
}

.proof-copy-right {
  justify-self: end;
  max-width: 32rem;
  padding-left: clamp(22px, 3vw, 42px);
}

.proof-copy h3 {
  margin: 0;
  font-size: clamp(23px, 2.3vw, 30px);
  line-height: 1.12;
}

.proof-visual {
  display: grid;
  align-content: start;
}

.proof-row-alt .proof-visual {
  justify-self: start;
}

.ai-guidance-cluster {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
  gap: 14px;
  align-items: stretch;
  max-width: 660px;
  justify-self: end;
}

.recommendation-card,
.muscle-surface-card {
  padding: 18px;
  display: grid;
  gap: 14px;
}

.recommendation-heading strong {
  margin: 0;
  font-size: 17px;
  line-height: 1.16;
}

.chat-proof-card.chat-mockup {
  align-self: stretch;
  justify-self: stretch;
  height: 100%;
  padding: 14px;
  grid-template-rows: auto 1fr;
  gap: 10px;
  border-radius: 20px;
  box-shadow: var(--landing-shadow-soft);
}

.chat-proof-card :deep(.chat-head) {
  align-items: flex-start;
}

.chat-proof-card :deep(.chat-eyebrow),
.analytics-proof-card :deep(.analytics-eyebrow),
.nutrition-proof-card :deep(.nutrition-eyebrow) {
  font-size: 10px;
  letter-spacing: 0.12em;
}

.chat-proof-card :deep(.chat-head strong) {
  font-size: 15px;
}

.chat-proof-card :deep(.chat-status) {
  min-height: 26px;
  padding: 0 9px;
  font-size: 11px;
}

.chat-proof-card :deep(.chat-body) {
  gap: 8px;
}

.chat-proof-card :deep(.chat-message) {
  padding: 10px 11px;
  border-radius: 14px;
}

.chat-proof-card :deep(.chat-message p) {
  font-size: 13px;
  line-height: 1.42;
}

.chat-proof-card :deep(.assistant-tags) {
  gap: 5px;
}

.chat-proof-card :deep(.assistant-tags span) {
  min-height: 22px;
  padding: 0 8px;
  font-size: 10px;
}

.muscle-surface-card {
  max-width: 680px;
  justify-self: end;
}

.system-proof-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
  gap: 14px;
  max-width: 760px;
  justify-self: end;
  align-items: stretch;
}

.system-proof-card {
  border-radius: 22px;
  box-shadow: var(--landing-shadow-soft);
}

.analytics-proof-card.analytics-mockup {
  height: 100%;
}

.nutrition-proof-card.nutrition-mockup {
  height: 100%;
}

.analytics-proof-card.analytics-mockup,
.nutrition-proof-card.nutrition-mockup {
  padding: 16px;
  gap: 14px;
}

.analytics-proof-card :deep(.analytics-head strong),
.nutrition-proof-card :deep(.nutrition-head strong) {
  font-size: 18px;
}

.analytics-proof-card :deep(.analytics-range span),
.nutrition-proof-card :deep(.nutrition-add) {
  min-height: 26px;
  padding: 0 9px;
  font-size: 11px;
}

.nutrition-proof-card :deep(.nutrition-add) {
  background: rgba(255, 90, 95, 0.08);
  color: var(--landing-coral);
}

.analytics-proof-card :deep(.analytics-grid) {
  gap: 8px;
}

.analytics-proof-card :deep(.analytics-stat),
.nutrition-proof-card :deep(.meal-tab),
.nutrition-proof-card :deep(.meal-log-card),
.nutrition-proof-card :deep(.add-food-card),
.nutrition-proof-card :deep(.trend-pill) {
  border-radius: 16px;
}

.analytics-proof-card :deep(.analytics-stat) {
  padding: 10px;
}

.analytics-proof-card :deep(.analytics-stat span),
.analytics-proof-card :deep(.analytics-stat small),
.nutrition-proof-card :deep(.meal-tab span),
.nutrition-proof-card :deep(.meal-log-head span),
.nutrition-proof-card :deep(.meal-log-head small),
.nutrition-proof-card :deep(.meal-entry span),
.nutrition-proof-card :deep(.meal-entry small),
.nutrition-proof-card :deep(.search-result span),
.nutrition-proof-card :deep(.search-result small),
.nutrition-proof-card :deep(.trend-pill span) {
  font-size: 11px;
}

.analytics-proof-card :deep(.analytics-stat strong) {
  font-size: 23px;
}

.analytics-proof-card :deep(.analytics-action) {
  padding: 12px;
  border-radius: 16px;
}

.analytics-proof-card :deep(.analytics-action strong) {
  font-size: 15px;
}

.analytics-proof-card :deep(.action-chip) {
  min-height: 28px;
  padding: 0 10px;
  font-size: 11px;
}

.nutrition-proof-card :deep(.meal-tabs) {
  gap: 8px;
}

.nutrition-proof-card :deep(.meal-tab) {
  padding: 10px;
}

.nutrition-proof-card :deep(.meal-tab strong),
.nutrition-proof-card :deep(.meal-entry strong),
.nutrition-proof-card :deep(.search-result strong) {
  font-size: 13px;
}

.nutrition-proof-card :deep(.nutrition-grid) {
  gap: 10px;
}

.nutrition-proof-card :deep(.meal-log-card),
.nutrition-proof-card :deep(.add-food-card) {
  padding: 12px;
}

.nutrition-proof-card :deep(.add-food-tabs span) {
  min-height: 28px;
  padding: 0 10px;
  font-size: 11px;
}

.nutrition-proof-card :deep(.search-field) {
  min-height: 38px;
  font-size: 12px;
}

.nutrition-proof-card :deep(.meal-entry),
.nutrition-proof-card :deep(.search-result) {
  padding: 10px;
  border-radius: 14px;
}

.nutrition-proof-card :deep(.trend-row) {
  gap: 8px;
}

.nutrition-proof-card :deep(.trend-pill) {
  padding: 9px 10px;
}

.nutrition-proof-card :deep(.trend-pill strong) {
  font-size: 14px;
}

.how-section {
  padding-top: 52px;
}

.secondary-section-head {
  margin-bottom: 16px;
}

.steps-grid {
  position: relative;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.steps-grid::before {
  content: '';
  position: absolute;
  left: 9%;
  right: 9%;
  top: 16px;
  height: 1px;
  background: linear-gradient(90deg, rgba(75, 123, 255, 0.08), rgba(75, 123, 255, 0.18), rgba(75, 123, 255, 0.08));
  pointer-events: none;
}

.step-card {
  position: relative;
  z-index: 1;
  min-height: 148px;
  padding: 14px 15px 13px;
  display: grid;
  gap: 7px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--landing-shadow-soft);
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(75, 123, 255, 0.08);
  color: var(--landing-blue);
  font-size: 11px;
  font-weight: 700;
}

.step-card h3 {
  font-size: 15px;
  line-height: 1.22;
}

.step-card p {
  max-width: 24ch;
  font-size: 15px;
  line-height: 1.55;
}

.landing-footer {
  padding: 8px 0 22px;
}

.footer-shell {
  display: grid;
  gap: 5px;
  padding-top: 6px;
  border-top: 1px solid var(--landing-border);
}

.footer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.footer-brand .brand-logo {
  width: 62px;
}

.footer-note {
  margin: 0;
  color: var(--landing-muted);
  font-size: 10px;
  line-height: 1.45;
  max-width: 420px;
}

.footer-links a {
  text-decoration: none;
  color: var(--landing-muted);
  font-size: 12px;
  font-weight: 600;
}

.anchor-section {
  scroll-margin-top: var(--landing-anchor-offset);
}

@media (max-width: 1120px) {
  .nav-shell {
    flex-wrap: wrap;
    justify-content: center;
  }

  .brand {
    width: 100%;
    justify-content: center;
  }

  .hero-section,
  .proof-row,
  .steps-grid {
    grid-template-columns: 1fr;
  }

  .hero-proof {
    width: min(100%, 680px);
    justify-self: stretch;
  }

  .proof-stage {
    grid-template-columns: 1fr;
    padding: 0;
  }

  .coach-card {
    width: 100%;
  }

  .muscle-card {
    width: min(100%, 280px);
    min-height: 0;
    justify-self: end;
  }

  .ai-guidance-cluster,
  .muscle-surface-card,
  .system-proof-grid {
    justify-self: stretch;
    max-width: none;
  }

  .analytics-proof-card.analytics-mockup {
    max-width: none;
    justify-self: stretch;
  }

  .proof-copy-right {
    justify-self: start;
    max-width: 34rem;
    padding-left: 0;
  }

  .footer-top {
    flex-direction: column;
  }

  .footer-links {
    justify-content: center;
  }
}

@media (max-width: 1024px) {
  .landing-nav {
    padding-top: 8px;
  }

  .landing-section {
    padding-top: 60px;
  }

  .hero-section {
    padding-top: 22px;
  }

  .ai-guidance-cluster,
  .system-proof-grid {
    grid-template-columns: 1fr;
  }

  .chat-proof-card {
    max-width: none;
    justify-self: stretch;
  }
}

@media (max-width: 720px) {
  .shell {
    width: min(100% - 24px, 1200px);
  }

  .nav-links {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px 10px;
  }

  .nav-actions,
  .hero-actions,
  .footer-links {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .hero-copy h1 {
    max-width: 13.1ch;
    font-size: clamp(32px, 9.6vw, 40px);
  }

  .features-head h2 {
    white-space: normal;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .hero-body,
  .proof-copy p,
  .feature-card p,
  .step-card p,
  .final-cta p,
  .section-subtitle {
    font-size: 16px;
  }

  .coach-card,
  .muscle-card,
  .feature-card,
  .recommendation-card,
  .muscle-surface-card,
  .step-card {
    padding: 18px;
    border-radius: 20px;
  }

  .steps-grid::before {
    display: none;
  }
  .coach-proof,
  .recommendation-foot {
    display: grid;
    gap: 6px;
  }

  .proof-copy h3 {
    font-size: 24px;
  }

  .chat-proof-card {
    max-width: none;
    justify-self: stretch;
  }
}
</style>
