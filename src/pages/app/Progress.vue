<template>
  <section class="progress-shell">
    <header class="hero">
      <span class="tagline">Progress Intelligence</span>
      <h1>Your momentum, visualised.</h1>
      <p>
        Fitness AI Planner will soon surface trends, highlight your strongest streaks, and show
        where to push harder or recover smarter.
      </p>
    </header>

    <div class="insight-grid">
      <article class="insight-card primary">
        <h2>Weekly Output</h2>
        <p class="metric">+12%</p>
        <p class="description">
          Consistency is compounding. Keep the cadence steady and the system will refine next week’s workload.
        </p>
      </article>

      <article class="insight-card">
        <h3>Recovery Balance</h3>
        <p class="description">
          Track sleep, HRV, and subjective readiness to keep intensity and restoration aligned.
        </p>
      </article>

      <article class="insight-card">
        <h3>Breakthrough Moments</h3>
        <p class="description">
          Personal records and standout sessions will collect here as soon as data flows in.
        </p>
      </article>
    </div>
  </section>
</template>

<script setup>
// 这里将来会接入进度分析的数据源与图表组件。
</script>

<style scoped>
.progress-shell {
  min-height: 100vh;
  padding: 80px clamp(24px, 6vw, 96px);
  background: #f8f8fb;
  color: #1d1d1f;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.hero {
  max-width: 680px;
}

.tagline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(0, 113, 227, 0.1);
  color: #0071e3;
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 16px 0 12px;
  font-size: clamp(36px, 5vw, 52px);
  font-weight: 600;
}

.hero p {
  margin: 0;
  color: #6e6e73;
  font-size: 18px;
  line-height: 1.7;
}

.insight-grid {
  margin-top: 56px;
  display: grid;
  gap: 28px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.insight-card {
  background: #fff;
  border-radius: 28px;
  padding: 28px;
  border: 1px solid rgba(210, 210, 215, 0.6);
  box-shadow: 0 20px 40px rgba(17, 17, 17, 0.04);
  display: grid;
  gap: 12px;
}

.insight-card.primary {
  background: linear-gradient(160deg, #111, #1f1f22);
  color: #f5f5f7;
  border: none;
  box-shadow: 0 32px 60px rgba(17, 17, 17, 0.2);
}

.insight-card.primary h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.metric {
  margin: 0;
  font-size: 48px;
  font-weight: 600;
}

.description {
  margin: 0;
  color: inherit;
  font-size: 16px;
  line-height: 1.7;
}

.insight-card h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

@media (max-width: 640px) {
  .progress-shell {
    padding: 64px 20px;
  }

  .insight-grid {
    gap: 20px;
  }

  .insight-card {
    border-radius: 22px;
    padding: 24px;
  }
}
</style>
