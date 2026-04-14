<template>
  <teleport to="body">
    <div v-if="open" class="overlay" @click.self="close">
      <section class="modal" role="dialog" aria-modal="true" aria-label="Add food entry">
        <header class="modal-head">
          <div>
            <h2>{{ editingEntry ? 'Edit Food' : 'Add Food' }}</h2>
            <p>Search the food database or add a custom meal entry.</p>
          </div>
          <button class="close-btn" type="button" @click="close">✕</button>
        </header>

        <div class="mode-tabs">
          <button type="button" class="mode-tab" :class="{ active: mode === 'search' }" @click="mode = 'search'">
            Search Food
          </button>
          <button type="button" class="mode-tab" :class="{ active: mode === 'custom' }" @click="mode = 'custom'">
            Custom Food
          </button>
        </div>

        <div class="modal-body">
          <div v-if="mode === 'search'" class="search-pane">
            <label class="field">
              <span>Search food</span>
              <input v-model="query" type="search" placeholder="Chicken breast, banana, Greek yogurt..." />
            </label>

            <FoodSearchResults
              :results="results"
              :loading="foodLoading"
              :error="foodError"
              :hint="foodHint"
              :selected-id="selectedFood?.sourceKey || selectedFood?.id || ''"
              :filter-mode="filterMode"
              @update:filter-mode="filterMode = $event"
              @select="handleSelectFood"
            />
          </div>

        <div v-else class="custom-grid">
            <label class="field">
              <span>Food name</span>
              <input v-model.trim="custom.foodName" type="text" placeholder="Homemade chicken rice bowl" />
            </label>
            <label class="field">
              <span>Brand / note</span>
              <input v-model.trim="custom.brand" type="text" placeholder="Optional" />
            </label>
            <label class="field">
              <span>Calories</span>
              <input v-model.number="custom.calories" type="number" min="0" step="1" />
            </label>
            <label class="field">
              <span>Protein (g)</span>
              <input v-model.number="custom.proteinG" type="number" min="0" step="0.1" />
            </label>
            <label class="field">
              <span>Carbs (g)</span>
              <input v-model.number="custom.carbsG" type="number" min="0" step="0.1" />
            </label>
            <label class="field">
              <span>Fat (g)</span>
              <input v-model.number="custom.fatG" type="number" min="0" step="0.1" />
            </label>
            <div class="estimate-row wide">
              <button class="estimate-btn" type="button" :disabled="estimateLoading" @click="estimateCustomFood">
                {{ estimateLoading ? 'Estimating...' : 'Estimate Nutrition with AI' }}
              </button>
              <p class="estimate-note">
                Use the food name, quantity, and unit to estimate calories, protein, carbohydrates, and fat. You can edit the values after they are filled in.
              </p>
              <p v-if="estimateMessage" class="estimate-feedback">{{ estimateMessage }}</p>
            </div>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>Meal type</span>
              <select v-model="mealType">
                <option v-for="item in mealTypeOptions" :key="item.id" :value="item.id">{{ item.label }}</option>
              </select>
            </label>
            <label class="field">
              <span>Date</span>
              <input v-model="entryDate" type="date" />
            </label>
            <label class="field">
              <span>Quantity</span>
              <input v-model.number="quantity" type="number" min="0" step="0.1" />
            </label>
            <label class="field">
              <span>Unit</span>
              <select v-model="unit">
                <option value="g">g</option>
                <option value="serving" :disabled="mode === 'search' && !servingSupported">
                  {{ servingOptionLabel }}
                </option>
              </select>
            </label>
            <label class="field wide">
              <span>Notes</span>
              <input v-model.trim="notes" type="text" placeholder="Optional note" />
            </label>
          </div>

          <article class="preview-card">
            <header>
              <strong>Nutrition preview</strong>
              <span>{{ previewLabel }}</span>
            </header>
            <div class="preview-grid">
              <div>
                <span>Calories</span>
                <strong>{{ preview.calories }}</strong>
              </div>
              <div>
                <span>Protein</span>
                <strong>{{ preview.proteinG }} g</strong>
              </div>
              <div>
                <span>Carbs</span>
                <strong>{{ preview.carbsG }} g</strong>
              </div>
              <div>
                <span>Fat</span>
                <strong>{{ preview.fatG }} g</strong>
              </div>
            </div>
          </article>

          <p v-if="displayError" class="helper error">{{ displayError }}</p>
        </div>

        <footer class="modal-foot">
          <button class="ghost-btn" type="button" @click="close">Cancel</button>
          <button class="save-btn" type="button" :disabled="saving" @click="submit">
            {{ saving ? 'Saving...' : editingEntry ? 'Save Changes' : 'Add Food' }}
          </button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import FoodSearchResults from './FoodSearchResults.vue'
import { useFoodSearch } from '@/composables/useFoodSearch'
import { calculateEntryFromFood, deriveFoodBaseFromEntry, roundNutrition, toNumber } from '@/utils/nutritionCalculations'
import { mealTypeOptions } from '@/utils/mealTimeResolver'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  open: { type: Boolean, default: false },
  selectedDate: { type: String, required: true },
  defaultMealType: { type: String, required: true },
  defaultUnit: { type: String, default: 'g' },
  defaultSearchMode: { type: String, default: 'recent' },
  editingEntry: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit'])
const auth = useAuthStore()
const NUTRITION_AI_ORIGIN = import.meta.env.VITE_NUTRITION_AGENT_ORIGIN || 'http://localhost:8000'

const {
  query,
  filterMode,
  results,
  loading: foodLoading,
  error: foodError,
  hint: foodHint,
  searchFoods,
  resolveSelectedFood,
  resolveFoodById
} =
  useFoodSearch()

const mode = ref('search')
const selectedFood = ref(null)
const mealType = ref(props.defaultMealType)
const entryDate = ref(props.selectedDate)
const quantity = ref(props.defaultUnit === 'serving' ? 1 : 100)
const unit = ref(props.defaultUnit === 'serving' ? 'serving' : 'g')
const notes = ref('')
const submitError = ref('')
const estimateLoading = ref(false)
const estimateMessage = ref('')
const suppressUnitSync = ref(false)

const custom = reactive({
  foodName: '',
  brand: '',
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0
})

const preview = computed(() => {
  if (mode.value === 'custom') {
    return {
      calories: roundNutrition(custom.calories, 0),
      proteinG: roundNutrition(custom.proteinG),
      carbsG: roundNutrition(custom.carbsG),
      fatG: roundNutrition(custom.fatG),
      quantityG: unit.value === 'g' ? quantity.value : null,
      servingCount: unit.value === 'serving' ? quantity.value : null
    }
  }
  return calculateEntryFromFood({
    food: selectedFood.value,
    quantity: quantity.value,
    unit: unit.value
  })
})

const previewLabel = computed(() => {
  if (mode.value === 'custom') return custom.foodName || 'Custom food'
  return selectedFood.value?.foodName || 'Select a food to preview'
})

const displayError = computed(() => submitError.value || props.error || '')

const servingSupported = computed(() => {
  if (mode.value === 'custom') return true
  const food = selectedFood.value
  if (!food) return false
  return (
    toNumber(food.servingSizeG || food.serving_size_g) > 0 ||
    toNumber(food.caloriesPerServing) > 0 ||
    toNumber(food.proteinPerServing) > 0 ||
    toNumber(food.carbsPerServing) > 0 ||
    toNumber(food.fatPerServing) > 0
  )
})

const servingOptionLabel = computed(() => {
  if (!selectedFood.value?.servingLabel) return 'serving'
  return `serving (${selectedFood.value.servingLabel})`
})

function getServingSizeValue() {
  return toNumber(selectedFood.value?.servingSizeG || selectedFood.value?.serving_size_g)
}

function resetCustom() {
  custom.foodName = ''
  custom.brand = ''
  custom.calories = 0
  custom.proteinG = 0
  custom.carbsG = 0
  custom.fatG = 0
  estimateMessage.value = ''
}

async function applyEditingState(entry) {
  suppressUnitSync.value = true
  mealType.value = entry?.mealType || props.defaultMealType
  entryDate.value = entry?.entryDate || props.selectedDate
  quantity.value = toNumber(entry?.quantity, 100)
  unit.value = entry?.unit === 'serving' ? 'serving' : 'g'
  notes.value = entry?.notes || ''
  submitError.value = ''
  estimateMessage.value = ''

  if (!entry) {
    mode.value = 'search'
    filterMode.value = props.defaultSearchMode === 'all' ? 'all' : 'recent'
    selectedFood.value = null
    resetCustom()
    query.value = ''
    unit.value = props.defaultUnit === 'serving' ? 'serving' : 'g'
    quantity.value = unit.value === 'serving' ? 1 : 100
    searchFoods('')
    suppressUnitSync.value = false
    return
  }

  if (entry.isCustom) {
    mode.value = 'custom'
    selectedFood.value = null
    custom.foodName = entry.foodNameSnapshot || ''
    custom.brand = entry.brandSnapshot || ''
    custom.calories = toNumber(entry.calories)
    custom.proteinG = toNumber(entry.proteinG)
    custom.carbsG = toNumber(entry.carbsG)
    custom.fatG = toNumber(entry.fatG)
  } else {
    mode.value = 'search'
    filterMode.value = 'all'
    try {
      selectedFood.value = (await resolveFoodById(entry.foodId)) || deriveFoodBaseFromEntry(entry)
    } catch {
      selectedFood.value = deriveFoodBaseFromEntry(entry)
    }
    query.value = entry.foodNameSnapshot || ''
    searchFoods(query.value)
    resetCustom()
  }
  suppressUnitSync.value = false
}

watch(
  () => [props.open, props.editingEntry, props.selectedDate, props.defaultMealType, props.defaultUnit, props.defaultSearchMode],
  () => {
    if (!props.open) return
    applyEditingState(props.editingEntry)
  },
  { immediate: true, deep: true }
)

watch(
  [selectedFood, servingSupported],
  () => {
    if (mode.value === 'search' && unit.value === 'serving' && !servingSupported.value) {
      unit.value = 'g'
    }
  },
  { immediate: true }
)

watch(
  selectedFood,
  (nextFood, previousFood) => {
    if (suppressUnitSync.value) return
    if (mode.value !== 'search') return
    if (!nextFood) return
    if (unit.value !== 'serving') return
    if (nextFood?.id === previousFood?.id && nextFood?.sourceKey === previousFood?.sourceKey) return

    quantity.value = 1
  }
)

watch(unit, (nextUnit, previousUnit) => {
  if (suppressUnitSync.value) return
  if (mode.value !== 'search') {
    if (nextUnit === 'serving' && quantity.value === 100) {
      quantity.value = 1
    }
    return
  }
  if (!selectedFood.value) {
    if (nextUnit === 'serving') {
      quantity.value = 1
    } else if (nextUnit === 'g' && previousUnit === 'serving') {
      quantity.value = 100
    }
    return
  }
  if (nextUnit === previousUnit) return

  const servingSize = getServingSizeValue()

  const currentQuantity = Math.max(toNumber(quantity.value, 0), 0)
  if (!currentQuantity) {
    quantity.value = nextUnit === 'serving' ? 1 : servingSize || 100
    return
  }

  if (previousUnit === 'g' && nextUnit === 'serving') {
    quantity.value = servingSize > 0 ? roundNutrition(currentQuantity / servingSize, 2) : 1
  } else if (previousUnit === 'serving' && nextUnit === 'g') {
    quantity.value = servingSize > 0 ? roundNutrition(currentQuantity * servingSize, 2) : 100
  }
})

function close() {
  emit('close')
}

async function handleSelectFood(item) {
  submitError.value = ''
  try {
    const resolved = await resolveSelectedFood(item)
    selectedFood.value = resolved || item
  } catch (error) {
    submitError.value = error?.message || 'Unable to load the selected food.'
  }
}

function showValidationPrompt(message) {
  submitError.value = message
  if (typeof window !== 'undefined') {
    window.alert(message)
  }
}

function validateSharedFields() {
  if (!mealType.value) {
    showValidationPrompt('Please fill in Meal type.')
    return false
  }
  if (!entryDate.value) {
    showValidationPrompt('Please fill in Date.')
    return false
  }
  if (!quantity.value || quantity.value <= 0) {
    showValidationPrompt('Please fill in Quantity.')
    return false
  }
  if (!unit.value) {
    showValidationPrompt('Please fill in Unit.')
    return false
  }
  return true
}

async function estimateCustomFood() {
  submitError.value = ''
  estimateMessage.value = ''

  if (!custom.foodName) {
    showValidationPrompt('Please fill in Food name.')
    return
  }
  if (!validateSharedFields()) return

  estimateLoading.value = true
  try {
    const response = await fetch(`${NUTRITION_AI_ORIGIN}/nutrition/estimate-food`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_name: custom.foodName,
        brand_or_note: custom.brand || '',
        quantity: Number(quantity.value) || 0,
        unit: unit.value,
        meal_type: mealType.value,
        user_profile: {
          name: auth.user?.name || 'KeepFit user',
          sex: auth.user?.sex || '',
          weightKg: auth.user?.weightKg || auth.user?.weight || null,
          heightCm: auth.user?.heightCm || auth.user?.height || null
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Nutrition estimate request failed (${response.status}).`)
    }

    const data = await response.json()
    custom.calories = roundNutrition(data?.calories, 2)
    custom.proteinG = roundNutrition(data?.protein_g, 2)
    custom.carbsG = roundNutrition(data?.carbs_g, 2)
    custom.fatG = roundNutrition(data?.fat_g, 2)
    estimateMessage.value = String(data?.explanation || 'Nutrition estimate updated.').trim()
  } catch (error) {
    const message = error?.message || 'Unable to estimate nutrition right now.'
    estimateMessage.value = message
    showValidationPrompt(message)
  } finally {
    estimateLoading.value = false
  }
}

function submit() {
  submitError.value = ''
  if (!validateSharedFields()) return
  if (mode.value === 'search' && !selectedFood.value) {
    showValidationPrompt('Please fill in Food selection.')
    return
  }
  if (mode.value === 'custom' && !custom.foodName) {
    showValidationPrompt('Please fill in Food name.')
    return
  }
  if (mode.value === 'custom' && toNumber(custom.calories) <= 0) {
    showValidationPrompt('Please fill in Calories or use Estimate Nutrition with AI.')
    return
  }

  const payload =
    mode.value === 'custom'
      ? {
          id: props.editingEntry?.id || null,
          entryDate: entryDate.value,
          mealType: mealType.value,
          foodId: null,
          foodNameSnapshot: custom.foodName,
          brandSnapshot: custom.brand || null,
          quantity: quantity.value,
          unit: unit.value,
          quantityG: unit.value === 'g' ? quantity.value : null,
          servingCount: unit.value === 'serving' ? quantity.value : null,
          calories: roundNutrition(custom.calories, 0),
          proteinG: roundNutrition(custom.proteinG),
          carbsG: roundNutrition(custom.carbsG),
          fatG: roundNutrition(custom.fatG),
          isCustom: true,
          notes: notes.value
        }
      : {
          id: props.editingEntry?.id || null,
          entryDate: entryDate.value,
          mealType: mealType.value,
          foodId: selectedFood.value.id,
          foodNameSnapshot: selectedFood.value.foodName,
          brandSnapshot: selectedFood.value.brand || null,
          quantity: preview.value.quantity,
          unit: preview.value.unit,
          quantityG: preview.value.quantityG,
          servingCount: preview.value.servingCount,
          calories: preview.value.calories,
          proteinG: preview.value.proteinG,
          carbsG: preview.value.carbsG,
          fatG: preview.value.fatG,
          isCustom: false,
          notes: notes.value
        }

  emit('submit', payload)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 70;
}

.modal {
  --nutrition-preview-bg: linear-gradient(180deg, rgba(239, 68, 68, 0.06), rgba(255, 255, 255, 0.96));
  --nutrition-preview-chip-bg: rgba(255, 255, 255, 0.72);
  width: min(920px, 100%);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: var(--shadow-strong);
  display: grid;
  grid-template-rows: auto auto 1fr auto;
}

.modal-head,
.modal-foot {
  padding: 20px 22px;
  border-bottom: 1px solid var(--border);
}

.modal-foot {
  border-top: 1px solid var(--border);
  border-bottom: none;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.modal-head h2 {
  margin: 0;
}

.modal-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.close-btn,
.mode-tab,
.field input,
.field select,
.ghost-btn,
.save-btn {
  border: 1px solid var(--border);
  border-radius: 14px;
}

.close-btn {
  width: 38px;
  height: 38px;
  background: var(--surface-muted);
}

.mode-tabs {
  display: inline-flex;
  gap: 6px;
  padding: 14px 22px 0;
}

.mode-tab {
  background: var(--surface-muted);
  padding: 10px 14px;
  font-weight: 700;
}

.mode-tab.active {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.22);
  color: var(--accent-strong);
}

.modal-body {
  overflow-y: auto;
  padding: 20px 22px;
  display: grid;
  gap: 18px;
}

.search-pane,
.custom-grid,
.form-grid {
  display: grid;
  gap: 12px;
}

.custom-grid,
.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.estimate-row {
  display: grid;
  gap: 8px;
  padding-top: 4px;
}

.field {
  display: grid;
  gap: 8px;
}

.field.wide {
  grid-column: 1 / -1;
}

.field span {
  font-size: 13px;
  font-weight: 700;
}

.field input,
.field select {
  min-height: 46px;
  padding: 0 14px;
  background: var(--surface-muted);
}

.estimate-btn {
  justify-self: start;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.08);
  color: var(--accent-strong);
  font-weight: 700;
}

.estimate-note,
.estimate-feedback {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.estimate-feedback {
  color: var(--accent-strong);
}

.preview-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--nutrition-preview-bg);
  padding: 16px;
  display: grid;
  gap: 14px;
}

.preview-card header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.preview-card header span {
  color: var(--text-muted);
  font-size: 12px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.preview-grid div {
  border-radius: 14px;
  background: var(--nutrition-preview-chip-bg);
  border: 1px solid var(--border);
  padding: 12px;
  display: grid;
  gap: 4px;
}

.preview-grid span {
  color: var(--text-muted);
  font-size: 12px;
}

.preview-grid strong {
  font-size: 18px;
}

.helper.error {
  margin: 0;
  color: #b91c1c;
  font-size: 13px;
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

:global(:root[data-theme='dark']) .modal {
  --nutrition-preview-bg:
    linear-gradient(180deg, rgba(239, 68, 68, 0.08), transparent 26%),
    linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.94));
  --nutrition-preview-chip-bg: rgba(15, 23, 42, 0.72);
}

@media (max-width: 760px) {
  .overlay {
    padding: 12px;
  }

  .custom-grid,
  .form-grid,
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .modal-foot {
    flex-direction: column;
  }
}
</style>
