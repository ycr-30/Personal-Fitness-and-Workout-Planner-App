<template>
  <section class="panel meal-section">
    <div class="section-head">
      <div>
        <h2>Meal Log</h2>
        <p>Track breakfast, lunch, dinner, and snacks</p>
      </div>
      <button class="primary-btn" type="button" @click="$emit('add-food', activeMeal)">+ Add Food</button>
    </div>

    <MealTabs
      :items="mealOptions"
      :model-value="activeMeal"
      :totals="mealTotals"
      :counts="mealCounts"
      @update:model-value="$emit('change-meal', $event)"
    />

    <div class="meal-content" :style="mealContentStyle">
      <header class="meal-strip">
        <div>
          <strong>{{ activeMealMeta.label }}</strong>
          <span>{{ activeMealMeta.secondary }}</span>
        </div>
        <div class="meal-strip-metrics">
          <span>{{ formatValue(activeTotals.calories) }} kcal</span>
          <small>
            Protein {{ formatValue(activeTotals.protein) }} g ·
            Carbohydrates {{ formatValue(activeTotals.carbs) }} g ·
            Fat {{ formatValue(activeTotals.fat) }} g
          </small>
        </div>
      </header>

      <div v-if="loading" class="state" :style="mealStateStyle">Loading meal entries...</div>
      <div v-else-if="error" class="state error" :style="mealStateStyle">{{ error }}</div>
      <div v-else-if="!activeEntries.length" class="state" :style="mealStateStyle">
        No foods logged in {{ activeMealMeta.label.toLowerCase() }} yet.
      </div>
      <div v-else class="entry-list">
        <FoodEntryRow
          v-for="entry in activeEntries"
          :key="entry.id"
          :entry="entry"
          @edit="$emit('edit-food', $event)"
          @delete="$emit('delete-food', $event)"
        />
      </div>
    </div>

    <button class="secondary-btn" type="button" @click="$emit('add-food', activeMeal)">
      + Add Food to {{ activeMealMeta.label }}
    </button>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MealTabs from './MealTabs.vue'
import FoodEntryRow from './FoodEntryRow.vue'
import { getMealTypeMeta, mealTypeOptions } from '@/utils/mealTimeResolver'

const props = defineProps({
  groupedEntries: { type: Object, default: () => ({}) },
  activeMeal: { type: String, required: true },
  mealTotals: { type: Object, default: () => ({}) },
  mealCounts: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

defineEmits(['change-meal', 'add-food', 'edit-food', 'delete-food'])

const mealOptions = mealTypeOptions
const activeMealMeta = computed(() => getMealTypeMeta(props.activeMeal))
const activeEntries = computed(() => props.groupedEntries?.[props.activeMeal] || [])
const activeTotals = computed(() => props.mealTotals?.[props.activeMeal] || {})
const activeTheme = ref('light')
let themeObserver = null

const mealContentStyle = computed(() => (
  activeTheme.value === 'dark'
    ? {
        backgroundColor: '#0f172a',
        backgroundImage:
          'linear-gradient(180deg, rgba(242, 111, 111, 0.04), transparent 26%), linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.94))',
        borderColor: 'color-mix(in srgb, var(--border) 84%, transparent)'
      }
    : {
        backgroundColor: '#ffffff',
        backgroundImage: 'linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96))',
        borderColor: 'var(--border)'
      }
))

const mealStateStyle = computed(() => (
  activeTheme.value === 'dark'
    ? {
        backgroundColor: 'color-mix(in srgb, var(--surface-muted) 92%, transparent)',
        borderColor: 'color-mix(in srgb, var(--border) 72%, transparent)'
      }
    : {
        backgroundColor: 'var(--surface-muted)',
        borderColor: 'transparent'
      }
))

function formatValue(value) {
  return Number(value || 0).toFixed(2)
}

function syncThemeSnapshot() {
  if (typeof document === 'undefined') return
  activeTheme.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

onMounted(() => {
  syncThemeSnapshot()
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    themeObserver = new MutationObserver(syncThemeSnapshot)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
  }
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow-soft);
  padding: 18px;
  display: grid;
  gap: 16px;
}

.section-head,
.meal-strip,
.meal-strip-metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-head h2 {
  margin: 0;
  font-size: 24px;
}

.section-head p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.primary-btn,
.secondary-btn {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 700;
}

.primary-btn {
  background: var(--accent);
  color: #fff;
  border-color: transparent;
}

.secondary-btn {
  background: var(--surface-muted);
}

.meal-content {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96));
  padding: 16px;
  display: grid;
  gap: 16px;
}

.meal-strip {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.meal-strip > div {
  display: grid;
  gap: 4px;
}

.meal-strip span,
.meal-strip small {
  color: var(--text-muted);
}

.state {
  min-height: 180px;
  border-radius: 16px;
  background: var(--surface-muted);
  border: 1px solid transparent;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--text-muted);
  padding: 16px;
}

.state.error {
  color: #b91c1c;
}

.entry-list {
  display: grid;
  gap: 12px;
}

@media (max-width: 720px) {
  .section-head,
  .meal-strip {
    flex-direction: column;
    align-items: flex-start;
  }

  .primary-btn {
    width: 100%;
  }
}

</style>
