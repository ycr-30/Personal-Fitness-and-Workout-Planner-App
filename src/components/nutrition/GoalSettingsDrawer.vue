<template>
  <teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <aside class="drawer">
        <header class="drawer-head">
          <div>
            <h2>Nutrition Goals</h2>
            <p>Set your active calories, macros, and hydration targets.</p>
          </div>
          <button class="close-btn" type="button" @click="$emit('close')">✕</button>
        </header>

        <div class="drawer-body">
          <section class="section-card">
            <div>
              <div class="section-headline">
                <strong>Goal Source</strong>
                <span class="link-badge">Linked from Plan</span>
              </div>
              <div class="target-list">
                <div class="target-row">
                  <span>Goal source</span>
                  <strong>Synced from Plan</strong>
                </div>
                <div class="target-row">
                  <span>Current workout goal</span>
                  <strong>{{ planGoalLink?.workoutGoalLabel || 'No workout goal selected' }}</strong>
                </div>
                <div class="target-row">
                  <span>Nutrition goal type</span>
                  <strong>{{ goalTypeLabel }}</strong>
                </div>
              </div>
              <div class="source-actions">
                <button class="mini-action" type="button" @click="goToPlan">Change in Plan</button>
              </div>
            </div>
          </section>

          <section class="section-card">
            <div class="section-headline">
              <strong>Active Targets</strong>
            </div>
            <p class="helper">
              These values are prefilled from the nutrition recommendation linked to your current Plan goal. You can edit them before saving.
            </p>

            <div class="field-grid">
              <label class="field">
                <span>Calories target</span>
                <input v-model.number="form.calories_target" type="number" min="0" step="10" />
              </label>
              <label class="field">
                <span>Protein target (grams)</span>
                <input v-model.number="form.protein_target_g" type="number" min="0" step="1" />
              </label>
              <label class="field">
                <span>Carbohydrates target (grams)</span>
                <input v-model.number="form.carbs_target_g" type="number" min="0" step="1" />
              </label>
              <label class="field">
                <span>Fat target (grams)</span>
                <input v-model.number="form.fat_target_g" type="number" min="0" step="1" />
              </label>
              <label class="field">
                <span>Water target (millilitres)</span>
                <input v-model.number="form.water_target_ml" type="number" min="0" step="100" />
              </label>
            </div>
          </section>
        </div>

        <footer class="drawer-foot">
          <button class="ghost-btn" type="button" @click="$emit('close')">Cancel</button>
          <button class="save-btn" type="button" :disabled="loading || saving" @click="submit">
            {{ saving ? 'Saving...' : 'Save Goals' }}
          </button>
        </footer>
      </aside>
    </div>
  </teleport>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { resolveNutritionGoalTypeLabel } from '@/utils/nutritionGoalMapping'

const props = defineProps({
  open: { type: Boolean, default: false },
  goals: { type: Object, default: null },
  planGoalLink: { type: Object, default: () => ({}) },
  recommendedTargets: { type: Object, default: () => ({}) },
  recommendedTargetsLoading: { type: Boolean, default: false },
  recommendedTargetsError: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['close', 'save'])
const router = useRouter()

const form = reactive({
  goal_type: 'maintenance',
  calories_target: 0,
  protein_target_g: 0,
  carbs_target_g: 0,
  fat_target_g: 0,
  water_target_ml: 2500
})
const activeRecommendation = computed(
  () => props.recommendedTargets?.[effectiveGoalType.value] || props.goals || null
)
const effectiveGoalType = computed(() => props.planGoalLink?.nutritionGoalType || form.goal_type)
const goalTypeLabel = computed(() => {
  return resolveNutritionGoalTypeLabel(effectiveGoalType.value)
})

watch(
  [() => props.goals, activeRecommendation],
  ([value, recommendation]) => {
    const preferRecommendation =
      !value ||
      Boolean(value.use_ai_targets) ||
      !Number(value.calories_target) ||
      !Number(value.protein_target_g) ||
      !Number(value.carbs_target_g) ||
      !Number(value.fat_target_g)

    form.goal_type = props.planGoalLink?.nutritionGoalType || value?.goal_type || 'maintenance'
    form.calories_target = Number(
      preferRecommendation ? recommendation?.calories_target || value?.calories_target : value?.calories_target || 0
    )
    form.protein_target_g = Number(
      preferRecommendation
        ? recommendation?.protein_target_g || value?.protein_target_g
        : value?.protein_target_g || 0
    )
    form.carbs_target_g = Number(
      preferRecommendation ? recommendation?.carbs_target_g || value?.carbs_target_g : value?.carbs_target_g || 0
    )
    form.fat_target_g = Number(
      preferRecommendation ? recommendation?.fat_target_g || value?.fat_target_g : value?.fat_target_g || 0
    )
    form.water_target_ml = Number(value?.water_target_ml || recommendation?.water_target_ml || 2500)
  },
  { immediate: true, deep: true }
)

watch(
  () => props.planGoalLink,
  (value) => {
    if (value?.nutritionGoalType) {
      form.goal_type = value.nutritionGoalType
    }
  },
  { immediate: true, deep: true }
)

function goToPlan() {
  emit('close')
  router.push('/plan')
}

function submit() {
  emit('save', {
    ...form,
    goal_type: effectiveGoalType.value
  })
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: flex-end;
  z-index: 60;
}

.drawer {
  width: min(460px, 100%);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-strong);
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.drawer-head,
.drawer-foot {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.drawer-foot {
  border-top: 1px solid var(--border);
  border-bottom: none;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.drawer-head h2 {
  margin: 0;
}

.drawer-head p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.close-btn,
.ghost-btn,
.save-btn,
.field select,
.field input {
  border: 1px solid var(--border);
  border-radius: 14px;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: var(--surface-muted);
}

.drawer-body {
  padding: 20px;
  display: grid;
  gap: 16px;
  overflow-y: auto;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  font-size: 13px;
  font-weight: 700;
}

.field select,
.field input {
  min-height: 44px;
  background: var(--surface-muted);
  padding: 0 14px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.section-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
  background: var(--surface-muted);
  display: grid;
  gap: 10px;
}

.section-headline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.link-badge,
.source-chip {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid var(--border);
  background: rgba(239, 68, 68, 0.08);
  color: var(--accent-strong);
}

.ai-box strong {
  display: block;
}

.ai-box p,
.ai-box small {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.ai-note {
  margin-bottom: 10px;
}

.target-list {
  display: grid;
  gap: 10px;
  margin: 12px 0;
}

.target-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 88%, white 12%);
}

.target-row span {
  font-size: 13px;
  color: var(--text-muted);
}

.target-row strong {
  font-size: 14px;
  text-align: right;
}

.source-actions {
  display: flex;
  justify-content: flex-start;
}

.mini-action {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 10px 12px;
  font-weight: 700;
}

.ghost-btn,
.save-btn {
  padding: 11px 14px;
  background: var(--surface-muted);
  font-weight: 700;
}

.save-btn {
  background: var(--accent);
  color: #fff;
  border-color: transparent;
}

.helper.error {
  margin: 0;
  color: #b91c1c;
  font-size: 13px;
}

@media (max-width: 560px) {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .drawer-foot {
    flex-direction: column;
  }
}
</style>
