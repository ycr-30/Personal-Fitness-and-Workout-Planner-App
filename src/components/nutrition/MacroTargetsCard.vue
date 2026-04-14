<template>
  <article class="panel macro-card">
    <div class="panel-head">
      <div>
        <h2>Macronutrients Target</h2>
        <p>Effective target updates from your goal settings</p>
      </div>
      <span class="target-mode">{{ summary.targets.useAiTargets ? 'Using AI target' : 'Using custom target' }}</span>
    </div>

    <div class="macro-grid">
      <article v-for="item in macroItems" :key="item.id" class="macro-item">
        <div class="mini-ring" :style="item.style">
          <div class="mini-ring-inner">
            <strong>{{ item.consumed }}</strong>
            <span>g</span>
          </div>
        </div>
        <div class="macro-copy">
          <div class="macro-head">
            <h3>{{ item.label }}</h3>
            <span>{{ item.progress }}%</span>
          </div>
          <p>{{ item.consumed }}g consumed · {{ item.remaining }}g remaining</p>
          <small>Target {{ item.target }}g · AI {{ item.ai }}g · Custom {{ item.custom }}g</small>
        </div>
      </article>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: {
    type: Object,
    required: true
  }
})

const macroItems = computed(() => [
  {
    id: 'protein',
    label: 'Protein',
    consumed: Math.round(props.summary?.proteinG || 0),
    target: Math.round(props.summary?.targets?.protein || 0),
    ai: Math.round(props.summary?.targets?.aiProtein || 0),
    custom: Math.round(props.summary?.targets?.customProtein || 0),
    remaining: Math.max(Math.round((props.summary?.targets?.protein || 0) - (props.summary?.proteinG || 0)), 0),
    progress: props.summary?.targets?.protein
      ? Math.min(100, Math.round(((props.summary?.proteinG || 0) / props.summary.targets.protein) * 100))
      : 0,
    style: { '--value': `${props.summary?.targets?.protein ? Math.min(100, Math.round(((props.summary?.proteinG || 0) / props.summary.targets.protein) * 100)) : 0}%`, '--color': '#2563eb' }
  },
  {
    id: 'carbs',
    label: 'Carbs',
    consumed: Math.round(props.summary?.carbsG || 0),
    target: Math.round(props.summary?.targets?.carbs || 0),
    ai: Math.round(props.summary?.targets?.aiCarbs || 0),
    custom: Math.round(props.summary?.targets?.customCarbs || 0),
    remaining: Math.max(Math.round((props.summary?.targets?.carbs || 0) - (props.summary?.carbsG || 0)), 0),
    progress: props.summary?.targets?.carbs
      ? Math.min(100, Math.round(((props.summary?.carbsG || 0) / props.summary.targets.carbs) * 100))
      : 0,
    style: { '--value': `${props.summary?.targets?.carbs ? Math.min(100, Math.round(((props.summary?.carbsG || 0) / props.summary.targets.carbs) * 100)) : 0}%`, '--color': '#10b981' }
  },
  {
    id: 'fat',
    label: 'Fat',
    consumed: Math.round(props.summary?.fatG || 0),
    target: Math.round(props.summary?.targets?.fat || 0),
    ai: Math.round(props.summary?.targets?.aiFat || 0),
    custom: Math.round(props.summary?.targets?.customFat || 0),
    remaining: Math.max(Math.round((props.summary?.targets?.fat || 0) - (props.summary?.fatG || 0)), 0),
    progress: props.summary?.targets?.fat
      ? Math.min(100, Math.round(((props.summary?.fatG || 0) / props.summary.targets.fat) * 100))
      : 0,
    style: { '--value': `${props.summary?.targets?.fat ? Math.min(100, Math.round(((props.summary?.fatG || 0) / props.summary.targets.fat) * 100)) : 0}%`, '--color': '#f59e0b' }
  }
])
</script>

<style scoped>
.panel {
  --macro-ring-core: #fff;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow-soft);
  padding: 18px;
  display: grid;
  gap: 16px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.panel-head h2 {
  margin: 0;
  font-size: 20px;
}

.panel-head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.target-mode {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
}

.macro-grid {
  display: grid;
  gap: 12px;
}

.macro-item {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
}

.mini-ring {
  width: 88px;
  height: 88px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at center, var(--macro-ring-core) 58%, transparent 59%),
    conic-gradient(var(--color) 0 var(--value), rgba(148, 163, 184, 0.18) var(--value) 100%);
}

.mini-ring-inner {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
  text-align: center;
}

.mini-ring-inner strong {
  display: block;
  font-size: 16px;
  line-height: 1;
}

.mini-ring-inner span,
.macro-copy p,
.macro-copy small {
  color: var(--text-muted);
}

.macro-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.macro-head h3 {
  margin: 0;
  font-size: 16px;
}

.macro-head span {
  font-weight: 700;
}

.macro-copy {
  display: grid;
  gap: 5px;
}

.macro-copy p,
.macro-copy small {
  margin: 0;
  font-size: 12px;
}

:global(:root[data-theme='dark']) .macro-card {
  --macro-ring-core: rgba(15, 23, 42, 0.96);
}
</style>
