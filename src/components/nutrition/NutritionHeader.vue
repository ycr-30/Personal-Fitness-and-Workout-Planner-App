<template>
  <header class="nutrition-header">
    <div class="header-copy">
      <p class="eyebrow">Nutrition Tracker</p>
      <h1>Nutrition</h1>
      <p class="subtitle">Log meals, hydration, and AI guidance from real data.</p>
    </div>

    <div class="header-actions">
      <button class="ghost-btn" type="button" @click="$emit('open-goals')">Goal Settings</button>

      <div class="date-control">
        <button class="icon-btn" type="button" aria-label="Previous day" @click="$emit('previous')">
          &lt;
        </button>
        <button class="date-btn" type="button" @click="openPicker">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="6" width="16" height="14" rx="3" stroke="currentColor" stroke-width="1.5" fill="none" />
            <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span>{{ formattedDate }}</span>
          <input
            class="native-date"
            type="date"
            :value="selectedDate"
            :max="todayKey"
            @input="onDateInput"
            ref="dateInputRef"
          />
        </button>
        <button
          class="icon-btn"
          type="button"
          aria-label="Next day"
          :disabled="isAtToday"
          @click="$emit('next')"
        >
          &gt;
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatDisplayDate, parseDateValue, toDateKey } from '@/utils/mealTimeResolver'

const props = defineProps({
  selectedDate: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:date', 'previous', 'next', 'open-goals'])

const dateInputRef = ref(null)
const formattedDate = computed(() => formatDisplayDate(parseDateValue(props.selectedDate)))
const todayKey = computed(() => toDateKey(new Date()))
const isAtToday = computed(() => props.selectedDate >= todayKey.value)

function openPicker() {
  const input = dateInputRef.value
  if (!input) return
  if (typeof input.showPicker === 'function') {
    input.showPicker()
    return
  }
  input.focus()
  input.click()
}

function onDateInput(event) {
  const nextValue = event.target.value || todayKey.value
  emit('update:date', nextValue > todayKey.value ? todayKey.value : nextValue)
}
</script>

<style scoped>
.nutrition-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.header-copy {
  display: grid;
  gap: 8px;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
}

.header-copy h1 {
  margin: 0;
  font-size: clamp(30px, 3.8vw, 42px);
  line-height: 1.05;
  font-family: var(--font-display);
}

.subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.ghost-btn,
.date-control,
.date-btn,
.icon-btn {
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.ghost-btn {
  padding: 11px 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.date-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  font-size: 18px;
  color: var(--text-muted);
  background: var(--surface-muted);
}

.icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  color: color-mix(in srgb, var(--text-muted) 70%, white 30%);
}

.date-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-weight: 700;
  color: var(--text-primary);
  border: 0;
  overflow: hidden;
}

.date-btn svg {
  width: 17px;
  height: 17px;
}

.native-date {
  position: absolute;
  inset: auto;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 720px) {
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .date-control {
    width: 100%;
    justify-content: space-between;
  }

  .date-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
