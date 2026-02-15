<template>
  <section class="exercise-results">
    <header class="results-header">
      <div>
        <h3>Recommended Exercises</h3>
        <p v-if="selectedMuscleName">Filtered by {{ selectedMuscleName }}.</p>
        <p v-else>Select a muscle group to begin.</p>
      </div>
      <span class="results-count" v-if="!loading">{{ exercises.length }} items</span>
    </header>

    <div v-if="loading" class="results-loading">Loading exercises...</div>
    <div v-else-if="error" class="results-error">{{ error }}</div>
    <div v-else-if="exercises.length === 0" class="results-empty">
      No exercises match your current filters.
    </div>

    <div v-else class="results-grid">
      <article v-for="exercise in normalizedExercises" :key="exercise.id" class="exercise-card">
        <div class="media">
          <template v-if="exercise.mediaUrl">
            <video
              v-if="exercise.mediaType === 'video'"
              :src="exercise.mediaUrl"
              muted
              autoplay
              loop
              playsinline
            />
            <img v-else :src="exercise.mediaUrl" :alt="exercise.name" />
          </template>
          <div v-else class="media-placeholder">
            <span>Demo</span>
            <small>No media in source data</small>
          </div>
        </div>
        <div class="details">
          <header>
            <div>
              <h4>{{ exercise.name }}</h4>
              <p>{{ exercise.equipmentLabel || 'Bodyweight' }}</p>
            </div>
            <span v-if="exercise.difficulty" class="difficulty">{{ exercise.difficulty }}</span>
          </header>
          <div class="meta">
            <span>Primary: {{ exercise.primaryMuscle || '—' }}</span>
          </div>
          <ul>
            <li v-for="(tip, idx) in exercise.notes" :key="idx">{{ tip }}</li>
          </ul>
          <div class="card-actions">
            <button class="btn primary" type="button" @click="$emit('add', exercise.raw)">
              Add to workout log
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { buildExerciseView } from '@/lib/muscleMapUtils'

const props = defineProps({
  exercises: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  selectedMuscleName: {
    type: String,
    default: ''
  }
})

const normalizedExercises = computed(() =>
  props.exercises
    .map((exercise) =>
      buildExerciseView(exercise, {
        fallbackName: 'Untitled',
        fallbackInstruction: 'Form tips will appear once available.',
        maxInstructions: 6
      })
    )
    .filter(Boolean)
)
</script>

<style scoped>
.exercise-results {
  display: grid;
  gap: 14px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.results-header h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.results-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.results-count {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-weight: 600;
}

.results-loading,
.results-error,
.results-empty {
  padding: 14px;
  border-radius: 12px;
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 13px;
}

.results-error {
  background: #fee2e2;
  color: #b91c1c;
}

.results-grid {
  display: grid;
  gap: 14px;
}

.exercise-card {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.media {
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-muted);
  display: grid;
  place-items: center;
  min-height: 140px;
}

.media img,
.media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-placeholder {
  display: grid;
  place-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

.details {
  display: grid;
  gap: 10px;
}

.details header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.details h4 {
  margin: 0 0 4px;
  font-size: 16px;
}

.details p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.difficulty {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--info-soft);
  color: var(--text-muted);
}

.meta {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.details ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 860px) {
  .exercise-card {
    grid-template-columns: 1fr;
  }
}
</style>
