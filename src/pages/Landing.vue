<template>
  <main class="landing">
    <section class="hero">
      <span class="mark">Fitness AI Planner</span>
      <h1>Train with intention. See the story behind every rep.</h1>
      <p>
        A minimalist control center for planning sessions, auditing recovery, and keeping progress
        unmistakably clear.
      </p>

      <div class="actions">
        <RouterLink class="btn primary" to="/register">Get Started</RouterLink>
        <RouterLink class="btn" to="/login">Sign In</RouterLink>
      </div>
    </section>
  </main>
</template>

<script setup>
// 目前登陆页不需要额外的逻辑。
</script>

<style scoped>
.landing { min-height: 100vh; display: grid; place-items: center; background: #f5f5f7; padding: 80px 24px; font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; }
.hero { background: rgba(255,255,255,0.92); border: 1px solid rgba(210,210,215,0.6); border-radius: 32px; padding: clamp(32px, 6vw, 72px); max-width: 760px; width: min(92%, 760px); text-align: center; box-shadow: 0 30px 60px rgba(17,17,17,0.08); backdrop-filter: blur(18px); display: grid; gap: 24px; }
.mark { font-size: 16px; letter-spacing: 0.14em; text-transform: uppercase; color: #0071e3; }
h1 { margin: 0; font-size: clamp(32px, 5vw, 52px); font-weight: 600; color: #1d1d1f; }
p { margin: 0; color: #6e6e73; font-size: 18px; line-height: 1.7; }
.actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.btn { padding: 12px 20px; border-radius: 999px; border: 1px solid #111; text-decoration: none; color: #111; background: #fff; font-weight: 600; transition: transform .2s ease, box-shadow .2s ease, opacity .2s ease; }
.btn.primary { background: linear-gradient(160deg, #111, #1f1f22); color: #f5f5f7; border: none; box-shadow: 0 20px 40px rgba(17,17,17,0.18); }
.btn:hover { transform: translateY(-1px); box-shadow: 0 18px 30px rgba(17,17,17,0.12); }

@media (max-width: 640px) {
  .landing { padding: 64px 16px; }
  .hero { border-radius: 24px; }
}
</style>
