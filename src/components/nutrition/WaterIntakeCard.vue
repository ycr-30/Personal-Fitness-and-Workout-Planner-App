<template>
  <article class="panel water-card">
    <div class="water-head">
      <div class="water-copy">
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
          <h2>Water Intake</h2>
          <p>{{ Math.round(summary.waterMl) }} / {{ Math.round(summary.targets.water) }} ml</p>
        </div>
      </div>
      <div class="quick-actions">
        <button
          v-for="amount in normalizedQuickAmounts"
          :key="amount"
          class="quick-btn"
          type="button"
          :disabled="saving"
          @click="$emit('quick-add', amount)"
        >
          +{{ amount }} ml
        </button>
      </div>
    </div>

    <div class="progress-line">
      <span :style="{ width: `${summary.completion.waterPercent}%` }"></span>
    </div>

    <div class="water-meta">
      <strong>{{ summary.completion.waterPercent }}% complete</strong>
      <span>{{ Math.max(Math.round(summary.targets.water - summary.waterMl), 0) }} ml remaining</span>
    </div>

    <div class="water-history">
      <div v-if="error" class="state error-state">{{ error }}</div>
      <div v-if="loading" class="state">Loading water entries...</div>
      <div v-else-if="!entries.length" class="state">No water logged for this date yet.</div>
      <div v-else class="timeline-list">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="timeline-row"
        >
          <span class="timeline-dot" aria-hidden="true"></span>
          <span class="timeline-time">{{ formatEntryTime(entry.createdAt) }}</span>
          <strong class="timeline-amount">{{ Math.round(entry.amountMl) }} ml</strong>
          <button
            class="timeline-remove"
            type="button"
            :disabled="saving"
            @click="$emit('delete-water', entry.id)"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: { type: Object, required: true },
  entries: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  quickAmounts: {
    type: Array,
    default: () => [250, 500]
  }
})

defineEmits(['quick-add', 'delete-water'])

const normalizedQuickAmounts = computed(() => {
  const values = Array.isArray(props.quickAmounts) ? props.quickAmounts : []
  const normalized = values
    .map((value) => Math.max(50, Math.round(Number(value) || 0)))
    .filter(Boolean)
  return normalized.length ? normalized.slice(0, 3) : [250, 500]
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit'
})

function formatEntryTime(value) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return timeFormatter.format(date)
}
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

.water-head,
.water-copy,
.quick-actions,
.water-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.water-copy {
  justify-content: flex-start;
}

.water-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
}

.water-icon svg {
  width: 22px;
  height: 22px;
}

.water-copy h2 {
  margin: 0;
  font-size: 20px;
}

.water-copy p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.quick-actions {
  flex-wrap: wrap;
}

.quick-btn {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 14px;
  background: var(--surface-muted);
  font-weight: 700;
}

.progress-line {
  height: 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.progress-line span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
}

.water-meta {
  color: var(--text-muted);
  font-size: 13px;
}

.water-meta strong {
  color: var(--text-primary);
}

.water-history {
  display: grid;
  gap: 10px;
}

.timeline-list {
  display: grid;
  gap: 10px;
  max-height: 196px;
  overflow-y: auto;
  padding-right: 4px;
}

.timeline-row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-muted);
  padding: 12px 14px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #60a5fa, #2563eb);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.timeline-time {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.timeline-amount {
  font-size: 14px;
  color: var(--text-primary);
}

.timeline-remove {
  border: none;
  background: transparent;
  padding: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.state {
  color: var(--text-muted);
  font-size: 13px;
}

.error-state {
  color: #b91c1c;
  font-weight: 600;
}

@media (max-width: 720px) {
  .water-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .timeline-row {
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "dot time remove"
      "dot amount amount";
    align-items: start;
  }

  .timeline-dot {
    grid-area: dot;
    margin-top: 4px;
  }

  .timeline-time {
    grid-area: time;
  }

  .timeline-amount {
    grid-area: amount;
  }

  .timeline-remove {
    grid-area: remove;
  }
}
</style>
