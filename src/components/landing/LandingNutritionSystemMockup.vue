<template>
  <article class="nutrition-mockup" aria-hidden="true">
    <header class="nutrition-head">
      <div>
        <p class="nutrition-eyebrow">Nutrition System</p>
        <strong>Meal log summary</strong>
      </div>
      <span class="nutrition-add">Add food</span>
    </header>

    <div class="meal-tabs">
      <article
        v-for="meal in meals"
        :key="meal.label"
        class="meal-tab"
        :class="{ active: meal.active }"
      >
        <strong>{{ meal.label }}</strong>
        <span>{{ meal.note }}</span>
      </article>
    </div>

    <div class="nutrition-stack">
      <article class="meal-log-card">
        <header class="meal-log-head">
          <div>
            <span class="log-kicker">Latest meal</span>
            <strong>Dinner</strong>
          </div>
          <span class="meal-total">292 kcal · 1 item</span>
        </header>

        <div class="meal-entry">
          <div>
            <strong>Sandwiches</strong>
            <span>Protein 12.4 g · Carbs 31 g · Fat 13.3 g</span>
          </div>
          <small>100 g</small>
        </div>
      </article>
    </div>

    <div class="trend-row">
      <article v-for="trend in trends" :key="trend.label" class="trend-pill" :class="trend.tone">
        <span>{{ trend.label }}</span>
        <strong>{{ trend.value }}</strong>
      </article>
    </div>
  </article>
</template>

<script setup>
const meals = [
  { label: 'Breakfast', note: '0 kcal', active: false },
  { label: 'Lunch', note: '0 kcal', active: false },
  { label: 'Dinner', note: '292 kcal', active: true },
  { label: 'Snacks', note: '0 kcal', active: false }
]

const trends = [
  { label: 'Calories', value: '292 kcal', tone: 'coral' },
  { label: 'Protein', value: '12.4 g', tone: 'blue' },
  { label: 'Carbs', value: '31 g', tone: 'green' },
  { label: 'Water', value: '1000 ml', tone: 'sky' }
]
</script>

<style scoped>
.nutrition-mockup {
  border: 1px solid #e7ecf3;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 36px rgba(18, 24, 38, 0.05);
  padding: 15px;
  display: grid;
  gap: 10px;
}

.nutrition-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.nutrition-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.nutrition-head strong {
  font-size: 15px;
  line-height: 1.15;
  color: #121826;
  display: block;
  max-width: 150px;
}

.nutrition-add {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 90, 95, 0.1);
  color: #ff5a5f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.meal-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.meal-tab {
  border: 1px solid #e7ecf3;
  border-radius: 13px;
  background: #fcfdff;
  padding: 8px;
  display: grid;
  gap: 3px;
  flex: 1 1 calc(50% - 4px);
  min-width: 0;
}

.meal-tab strong {
  font-size: 12px;
  line-height: 1.2;
  color: #121826;
}

.meal-tab span {
  font-size: 10px;
  line-height: 1.4;
  color: #667085;
}

.meal-tab.active {
  background: linear-gradient(180deg, rgba(255, 90, 95, 0.06), rgba(255, 255, 255, 0.96));
  border-color: rgba(255, 90, 95, 0.2);
}

.nutrition-stack {
  display: grid;
  gap: 8px;
}

.meal-log-card {
  border: 1px solid #e7ecf3;
  border-radius: 18px;
  background: linear-gradient(180deg, #fcfdff 0%, #f8fbff 100%);
  padding: 11px;
  display: grid;
  gap: 8px;
}

.meal-log-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.log-kicker {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.meal-log-head strong {
  font-size: 15px;
  line-height: 1.15;
  color: #121826;
}

.meal-total,
.meal-log-head span,
.meal-log-head small,
.meal-entry span,
.meal-entry small {
  font-size: 11px;
  line-height: 1.45;
  color: #667085;
}

.meal-entry {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  padding: 10px;
}

.meal-entry strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  line-height: 1.2;
  color: #121826;
}

.trend-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.trend-pill {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  background: #fcfdff;
  padding: 9px 10px;
  display: grid;
  gap: 4px;
}

.trend-pill span {
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #667085;
}

.trend-pill strong {
  font-size: 14px;
  line-height: 1.2;
  color: #121826;
}

.trend-pill.coral {
  background: linear-gradient(180deg, rgba(255, 90, 95, 0.06), rgba(255, 255, 255, 0.96));
}

.trend-pill.blue {
  background: linear-gradient(180deg, rgba(75, 123, 255, 0.06), rgba(255, 255, 255, 0.96));
}

.trend-pill.green {
  background: linear-gradient(180deg, rgba(34, 183, 122, 0.08), rgba(255, 255, 255, 0.96));
}

.trend-pill.sky {
  background: linear-gradient(180deg, rgba(74, 181, 248, 0.08), rgba(255, 255, 255, 0.96));
}

@media (max-width: 860px) {
  .meal-tab {
    flex-basis: 100%;
  }

  .trend-row {
    grid-template-columns: 1fr;
  }
}
</style>
