<template>
  <section class="nutrition-page">
    <header class="page-header">
      <div>
        <h1>Nutrition Tracker</h1>
        <p>Monitor your daily intake and maintain your streak.</p>
      </div>
      <div class="date-control">
        <button class="icon-btn" type="button">&lt;</button>
        <button class="date-btn" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="6" width="16" height="14" rx="3" stroke="currentColor" stroke-width="1.5" fill="none" />
            <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          Today, 24 Oct
        </button>
        <button class="icon-btn" type="button">&gt;</button>
      </div>
    </header>

    <label class="search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.6" fill="none" />
        <path d="M16 16l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <input type="search" placeholder="Search foods to log (e.g. 'Chicken Breast', 'Banana')..." />
    </label>

    <div class="nutrition-grid">
      <article class="card calories-card">
        <div class="card-header">
          <div>
            <h2>Calories</h2>
            <p>Daily goal: 2,400 kcal</p>
          </div>
          <span class="status">On Track</span>
        </div>
        <div class="calorie-body">
          <div class="ring" style="--value: 77; --ring-color: #ef4444;">
            <div class="ring-inner">
              <strong>1,850</strong>
              <span>Consumed</span>
            </div>
          </div>
          <div class="calorie-stats">
            <div>
              <span>Goal</span>
              <strong>2,400</strong>
            </div>
            <div>
              <span>Food</span>
              <strong>1,850</strong>
            </div>
            <div>
              <span>Exercise</span>
              <strong>-320</strong>
            </div>
            <div class="remaining">
              <span>Remaining</span>
              <strong>550</strong>
            </div>
          </div>
        </div>
      </article>

      <article class="card macros-card">
        <div class="card-header">
          <div>
            <h2>Macronutrients</h2>
            <p>Balance your targets for the day.</p>
          </div>
        </div>
        <div class="macro-grid">
          <div v-for="macro in macros" :key="macro.name" class="macro">
            <div class="ring small" :style="macro.style">
              <div class="ring-inner">
                <strong>{{ macro.value }}g</strong>
                <span>/ {{ macro.goal }}g</span>
              </div>
            </div>
            <h3>{{ macro.name }}</h3>
            <p>{{ macro.progress }}% of goal</p>
          </div>
        </div>
      </article>
    </div>

    <article class="water-card">
      <div class="water-info">
        <div class="water-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 3c4 5 6 7 6 11a6 6 0 1 1-12 0c0-4 2-6 6-11z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            />
          </svg>
        </div>
        <div>
          <h3>Water Intake</h3>
          <p>Goal: 2500ml</p>
        </div>
      </div>
      <div class="water-progress">
        <span v-for="n in 8" :key="n" :class="['bar', { active: n <= 5 }]"></span>
      </div>
      <button class="add-btn" type="button">+</button>
    </article>

    <article class="meal-card">
      <header class="meal-header">
        <div class="meal-title">
          <span class="meal-icon">B</span>
          <h3>Breakfast</h3>
        </div>
        <span>645 kcal</span>
      </header>
      <div v-for="item in meals" :key="item.name" class="meal-row">
        <span class="food-icon">{{ item.symbol }}</span>
        <div>
          <strong>{{ item.name }}</strong>
          <p>{{ item.detail }}</p>
        </div>
        <span class="kcal">{{ item.kcal }} kcal</span>
      </div>
      <button class="add-food" type="button">+ Add Food</button>
    </article>
  </section>
</template>

<script setup>
const macros = [
  {
    name: 'Protein',
    value: 145,
    goal: 170,
    progress: 85,
    style: '--value: 85; --ring-color: #3b82f6;'
  },
  {
    name: 'Carbs',
    value: 165,
    goal: 300,
    progress: 55,
    style: '--value: 55; --ring-color: #10b981;'
  },
  {
    name: 'Fats',
    value: 28,
    goal: 70,
    progress: 40,
    style: '--value: 40; --ring-color: #f59e0b;'
  }
]

const meals = [
  {
    name: 'Oatmeal with Blueberries',
    detail: '1 bowl (250g) - 45g Carbs, 12g Protein',
    kcal: 320,
    symbol: 'O'
  },
  {
    name: 'Black Coffee',
    detail: '1 cup (240ml)',
    kcal: 5,
    symbol: 'C'
  },
  {
    name: 'Whole Wheat Toast',
    detail: '2 slices - Avocado spread',
    kcal: 320,
    symbol: 'T'
  }
]
</script>

<style scoped>
.nutrition-page {
  padding: 36px clamp(20px, 4vw, 48px) 60px;
  display: grid;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: clamp(28px, 3.4vw, 36px);
}

.page-header p {
  margin: 0;
  color: var(--text-muted);
}

.date-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 6px;
  box-shadow: var(--shadow-soft);
}

.date-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 8px 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.date-btn svg {
  width: 16px;
  height: 16px;
}

.icon-btn {
  border: none;
  background: var(--surface-soft);
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-size: 18px;
  color: var(--text-muted);
}

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-soft);
}

.search svg {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.search input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 14px;
}

.nutrition-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  animation: fadeUp 0.6s ease both;
}

.card {
  background: var(--surface);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.card-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.status {
  background: #dcfce7;
  color: #15803d;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
}

.calorie-body {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 20px;
  margin-top: 18px;
  align-items: center;
}

.ring {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: conic-gradient(var(--ring-color) calc(var(--value) * 1%), #f1f3f7 0);
  display: grid;
  place-items: center;
}

.ring.small {
  width: 90px;
  height: 90px;
}

.ring-inner {
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: var(--surface);
  display: grid;
  place-items: center;
  text-align: center;
  gap: 2px;
  padding: 6px;
}

.ring-inner strong {
  font-size: 16px;
}

.ring-inner span {
  font-size: 11px;
  color: var(--text-muted);
}

.calorie-stats {
  display: grid;
  gap: 10px;
}

.calorie-stats div {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.calorie-stats span {
  color: var(--text-muted);
}

.remaining strong {
  color: #15803d;
}

.macro-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.macro {
  display: grid;
  place-items: center;
  gap: 8px;
}

.macro h3 {
  margin: 0;
  font-size: 14px;
}

.macro p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.water-card {
  background: var(--info-surface);
  border-radius: 18px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  animation: fadeUp 0.6s ease 0.08s both;
}

.water-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.water-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--info-soft);
  display: grid;
  place-items: center;
  color: #3b82f6;
}

.water-icon svg {
  width: 20px;
  height: 20px;
}

.water-info h3 {
  margin: 0;
  font-size: 15px;
}

.water-info p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.water-progress {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.bar {
  width: 10px;
  height: 26px;
  border-radius: 6px;
  background: var(--info-soft);
}

.bar.active {
  background: #3b82f6;
}

.add-btn {
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
  font-size: 18px;
  color: #3b82f6;
}

.meal-card {
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
  padding: 18px 20px;
  display: grid;
  gap: 14px;
  box-shadow: var(--shadow-soft);
  animation: fadeUp 0.6s ease 0.16s both;
}

.meal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
}

.meal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meal-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--accent-soft);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--accent-strong);
}

.meal-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-muted);
}

.food-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--surface);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--text-muted);
}

.meal-row strong {
  display: block;
  font-size: 14px;
}

.meal-row p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.kcal {
  font-size: 13px;
  color: var(--text-muted);
}

.add-food {
  justify-self: center;
  border: none;
  background: transparent;
  color: var(--accent);
  font-weight: 700;
  padding: 8px;
}

@media (max-width: 760px) {
  .calorie-body {
    grid-template-columns: 1fr;
  }

  .water-card {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .water-progress {
    justify-content: flex-start;
  }
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
