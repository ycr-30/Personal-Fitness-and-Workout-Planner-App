<template>
  <div class="svg-shell" :class="{ loading, compact }" ref="container" v-html="svgMarkup"></div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  svgMarkup: {
    type: String,
    default: ''
  },
  selectedSlug: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const container = ref(null)
const NON_SELECTABLE = new Set(['hair', 'head', 'hands', 'feet', 'ankles', 'knees'])

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function getGroupSlug(group) {
  if (!group) return ''
  return group.dataset?.slug || group.getAttribute('data-slug') || group.id || ''
}

function updateSelection() {
  const el = container.value
  if (!el) return
  const selected = normalizeSlug(props.selectedSlug)
  const groups = el.querySelectorAll('.muscle-group')
  groups.forEach((group) => {
    const slug = normalizeSlug(getGroupSlug(group))
    group.classList.toggle('is-selected', !!selected && slug === selected)
  })
}

function handleClick(event) {
  const target = event?.target
  if (!target || !container.value) return
  const group = target.closest?.('.muscle-group')
  if (!group || !container.value.contains(group)) return
  const slug = normalizeSlug(getGroupSlug(group))
  if (!slug || NON_SELECTABLE.has(slug)) return
  emit('select', slug)
}

function bindEvents() {
  const el = container.value
  if (!el) return
  if (!el.__muscleBound) {
    el.addEventListener('click', handleClick)
    el.__muscleBound = true
  }
  updateSelection()
}

watch(
  () => props.svgMarkup,
  async () => {
    await nextTick()
    bindEvents()
  },
  { immediate: true }
)

watch(
  () => props.selectedSlug,
  async () => {
    await nextTick()
    updateSelection()
  }
)

onBeforeUnmount(() => {
  const el = container.value
  if (el?.__muscleBound) {
    el.removeEventListener('click', handleClick)
  }
})
</script>

<style scoped>
.svg-shell {
  width: 100%;
  border-radius: 18px;
  background: #eef2f7;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  padding: 14px;
  display: grid;
  place-items: center;
}

.svg-shell.compact {
  padding: 10px;
}

.svg-shell.loading {
  opacity: 0.6;
  pointer-events: none;
}

.svg-shell :deep(svg) {
  width: 100%;
  height: auto;
  max-height: 560px;
}

.svg-shell.compact :deep(svg) {
  max-height: 280px;
}

.svg-shell :deep(#border path) {
  stroke: #b9c2d0;
}

.svg-shell :deep(.muscle) {
  fill: #f7f7f8 !important;
  stroke: #b9c2d0;
  stroke-width: 1.2;
  transition: fill 0.2s ease, stroke 0.2s ease;
  cursor: pointer;
}

.svg-shell :deep(.muscle-group:hover .muscle) {
  fill: rgba(239, 68, 68, 0.28) !important;
}

.svg-shell :deep(.muscle-group.is-selected .muscle) {
  fill: var(--accent) !important;
  stroke: var(--accent-strong);
}
</style>
