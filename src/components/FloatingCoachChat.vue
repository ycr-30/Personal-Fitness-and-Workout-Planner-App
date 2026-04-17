<template>
  <div class="coach-widget" aria-live="polite">
    <button
      v-if="!isOpen"
      class="chat-bubble"
      :style="bubbleStyle"
      type="button"
      aria-label="Open AI coach chat"
      @pointerdown="onBubblePointerDown"
    >
      <span aria-hidden="true">🤖</span>
    </button>

    <section
      v-else
      class="chat-panel"
      :style="panelStyle"
      role="dialog"
      aria-modal="false"
      aria-label="AI coach chat"
    >
      <header class="chat-header" @pointerdown="onPanelPointerDown">
        <div>
          <p class="chat-eyebrow">AI Coach</p>
          <h2>Chat Assistant</h2>
        </div>
        <button class="close-btn" type="button" aria-label="Close chat" @click="closeChat">
          ✕
        </button>
      </header>

      <div ref="messagesRef" class="chat-body">
        <p v-if="loading" class="state-tip">Loading conversation...</p>
        <p v-else-if="!messages.length" class="state-tip">
          Start by telling me your goal, workout schedule, or nutrition question.
        </p>

        <article
          v-for="item in messages"
          :key="item.id"
          class="chat-message"
          :class="item.role === 'user' ? 'user' : 'assistant'"
        >
          <div class="chat-content" v-html="renderRichContent(item.content)" />
          <time>{{ formatTime(item.createdAt) }}</time>
        </article>
      </div>

      <p v-if="errorMessage" class="chat-error">{{ errorMessage }}</p>

      <form class="chat-composer" @submit.prevent="sendMessage">
        <textarea
          v-model="draftMessage"
          rows="2"
          maxlength="2000"
          placeholder="Ask for training, nutrition, or recovery advice..."
          :disabled="sending || loading"
          @keydown="onComposerKeydown"
        />
        <button class="send-btn" type="submit" :disabled="sending || loading || !draftMessage.trim()">
          {{ sending ? 'Sending...' : 'Send' }}
        </button>
      </form>

      <button
        v-for="handle in resizeHandles"
        :key="handle.direction"
        class="resize-handle"
        :class="`handle-${handle.direction}`"
        type="button"
        :aria-label="handle.label"
        @pointerdown="onResizePointerDown($event, handle.direction)"
      ></button>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { AUTH_SERVER_CONFIG_ERROR, AUTH_SERVER_ORIGIN, buildAuthServerUrl } from '@/lib/authServerOrigin'
import { getStableDeviceId, loadCloudClientState, saveCloudClientState } from '@/lib/cloudClientState'

const auth = useAuthStore()
const BUBBLE_SIZE = 50
const BUBBLE_PADDING = 8
const PANEL_MIN_WIDTH = 300
const PANEL_MIN_HEIGHT = 360
const PANEL_DEFAULT_WIDTH = 380
const PANEL_DEFAULT_HEIGHT = 560
const PANEL_PADDING = 12
const resizeHandles = [
  { direction: 'n', label: 'Resize from top edge' },
  { direction: 's', label: 'Resize from bottom edge' },
  { direction: 'e', label: 'Resize from right edge' },
  { direction: 'w', label: 'Resize from left edge' },
  { direction: 'ne', label: 'Resize from top-right corner' },
  { direction: 'nw', label: 'Resize from top-left corner' },
  { direction: 'se', label: 'Resize from bottom-right corner' },
  { direction: 'sw', label: 'Resize from bottom-left corner' }
]

const isOpen = ref(false)
const loading = ref(false)
const sending = ref(false)
const draftMessage = ref('')
const errorMessage = ref('')
const conversationId = ref(null)
const messages = ref([])
const messagesRef = ref(null)

const bubblePosition = ref({ x: 20, y: 20 })
const viewport = ref({ width: 0, height: 0 })
const dragState = ref(null)
const movedDuringDrag = ref(false)
const panelPosition = ref({ x: 24, y: 24 })
const panelSize = ref({ width: PANEL_DEFAULT_WIDTH, height: PANEL_DEFAULT_HEIGHT })
const panelDragState = ref(null)
const panelResizeState = ref(null)

const bubbleStyle = computed(() => ({
  left: `${bubblePosition.value.x}px`,
  top: `${bubblePosition.value.y}px`
}))

const panelStyle = computed(() => ({
  left: `${panelPosition.value.x}px`,
  top: `${panelPosition.value.y}px`,
  width: `${panelSize.value.width}px`,
  height: `${panelSize.value.height}px`
}))

const bubbleStorageKey = computed(() => {
  const identity = auth.user?.id || auth.user?.account || auth.user?.email || 'default'
  return `pf_chat_bubble_position_${identity}`
})

const panelStorageKey = computed(() => {
  const identity = auth.user?.id || auth.user?.account || auth.user?.email || 'default'
  return `pf_chat_panel_state_${identity}`
})

function defaultBubblePosition() {
  return {
    x: Math.max(BUBBLE_PADDING, viewport.value.width - BUBBLE_SIZE - 16),
    y: Math.max(BUBBLE_PADDING, viewport.value.height - BUBBLE_SIZE - 16)
  }
}

function ensureAuthServerConfigured() {
  if (AUTH_SERVER_ORIGIN || import.meta.env.DEV) return true
  errorMessage.value = AUTH_SERVER_CONFIG_ERROR
  return false
}

function maxPanelWidth() {
  return Math.max(PANEL_MIN_WIDTH, viewport.value.width - PANEL_PADDING * 2)
}

function maxPanelHeight() {
  return Math.max(PANEL_MIN_HEIGHT, viewport.value.height - PANEL_PADDING * 2)
}

function clampPanelSize(size) {
  return {
    width: Math.min(maxPanelWidth(), Math.max(PANEL_MIN_WIDTH, Number(size?.width) || PANEL_DEFAULT_WIDTH)),
    height: Math.min(maxPanelHeight(), Math.max(PANEL_MIN_HEIGHT, Number(size?.height) || PANEL_DEFAULT_HEIGHT))
  }
}

function defaultPanelSize() {
  return clampPanelSize({ width: PANEL_DEFAULT_WIDTH, height: PANEL_DEFAULT_HEIGHT })
}

function defaultPanelPosition() {
  const size = panelSize.value
  const bubbleX = bubblePosition.value.x + BUBBLE_SIZE + 8
  const bubbleY = bubblePosition.value.y - size.height + BUBBLE_SIZE
  const x = bubbleX + size.width <= viewport.value.width - PANEL_PADDING
    ? bubbleX
    : bubblePosition.value.x - size.width - 8
  return clampPanelPosition({ x, y: bubbleY }, size)
}

function clampPanelPosition(position, size = panelSize.value) {
  const maxX = Math.max(PANEL_PADDING, viewport.value.width - size.width - PANEL_PADDING)
  const maxY = Math.max(PANEL_PADDING, viewport.value.height - size.height - PANEL_PADDING)
  return {
    x: Math.min(maxX, Math.max(PANEL_PADDING, Number(position?.x) || 0)),
    y: Math.min(maxY, Math.max(PANEL_PADDING, Number(position?.y) || 0))
  }
}

function clampBubblePosition(position) {
  const maxX = Math.max(BUBBLE_PADDING, viewport.value.width - BUBBLE_SIZE - BUBBLE_PADDING)
  const maxY = Math.max(BUBBLE_PADDING, viewport.value.height - BUBBLE_SIZE - BUBBLE_PADDING)
  return {
    x: Math.min(maxX, Math.max(BUBBLE_PADDING, Number(position?.x) || 0)),
    y: Math.min(maxY, Math.max(BUBBLE_PADDING, Number(position?.y) || 0))
  }
}

function readStoredBubblePosition() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(bubbleStorageKey.value)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

function readStoredPanelState() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(panelStorageKey.value)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

function saveBubblePosition() {
  if (typeof window === 'undefined') return
  localStorage.setItem(bubbleStorageKey.value, JSON.stringify(bubblePosition.value))
  saveCloudClientState({
    scope: 'device',
    deviceId: getStableDeviceId(),
    stateKey: 'chat_bubble_position',
    stateValue: bubblePosition.value
  }).catch((error) => {
    console.error('Failed to save bubble position to cloud', error)
  })
}

function savePanelState() {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    panelStorageKey.value,
    JSON.stringify({
      position: panelPosition.value,
      size: panelSize.value
    })
  )
  saveCloudClientState({
    scope: 'device',
    deviceId: getStableDeviceId(),
    stateKey: 'chat_panel_state',
    stateValue: {
      position: panelPosition.value,
      size: panelSize.value
    }
  }).catch((error) => {
    console.error('Failed to save panel state to cloud', error)
  })
}

function resetBubblePosition() {
  const stored = readStoredBubblePosition()
  const fallback = defaultBubblePosition()
  bubblePosition.value = clampBubblePosition(stored || fallback)
}

function resetPanelState() {
  const stored = readStoredPanelState()
  const size = clampPanelSize(stored?.size || defaultPanelSize())
  panelSize.value = size
  panelPosition.value = clampPanelPosition(stored?.position || defaultPanelPosition(), size)
}

async function hydrateCloudChatState() {
  try {
    const state = await loadCloudClientState({
      scope: 'device',
      deviceId: getStableDeviceId(),
      keys: ['chat_bubble_position', 'chat_panel_state']
    })

    const bubble = state?.chat_bubble_position
    if (bubble && typeof bubble === 'object') {
      bubblePosition.value = clampBubblePosition(bubble)
      localStorage.setItem(bubbleStorageKey.value, JSON.stringify(bubblePosition.value))
    }

    const panel = state?.chat_panel_state
    if (panel && typeof panel === 'object') {
      const size = clampPanelSize(panel?.size || defaultPanelSize())
      panelSize.value = size
      panelPosition.value = clampPanelPosition(panel?.position || defaultPanelPosition(), size)
      localStorage.setItem(
        panelStorageKey.value,
        JSON.stringify({
          position: panelPosition.value,
          size: panelSize.value
        })
      )
    }
  } catch (error) {
    console.error('Failed to hydrate chat state from cloud', error)
  }
}

function onWindowResize() {
  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  bubblePosition.value = clampBubblePosition(bubblePosition.value)
  panelSize.value = clampPanelSize(panelSize.value)
  panelPosition.value = clampPanelPosition(panelPosition.value, panelSize.value)
}

function cleanupDragEvents() {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onBubblePointerMove)
  window.removeEventListener('pointerup', onBubblePointerUp)
  window.removeEventListener('pointercancel', onBubblePointerUp)
}

function cleanupPanelDragEvents() {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onPanelPointerMove)
  window.removeEventListener('pointerup', onPanelPointerUp)
  window.removeEventListener('pointercancel', onPanelPointerUp)
}

function cleanupResizeEvents() {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onResizePointerMove)
  window.removeEventListener('pointerup', onResizePointerUp)
  window.removeEventListener('pointercancel', onResizePointerUp)
}

function onBubblePointerDown(event) {
  if (event.button !== 0) return
  movedDuringDrag.value = false
  dragState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: bubblePosition.value.x,
    originY: bubblePosition.value.y
  }
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  cleanupDragEvents()
  window.addEventListener('pointermove', onBubblePointerMove)
  window.addEventListener('pointerup', onBubblePointerUp)
  window.addEventListener('pointercancel', onBubblePointerUp)
}

function onBubblePointerMove(event) {
  if (!dragState.value || event.pointerId !== dragState.value.pointerId) return
  const deltaX = event.clientX - dragState.value.startX
  const deltaY = event.clientY - dragState.value.startY
  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    movedDuringDrag.value = true
  }
  bubblePosition.value = clampBubblePosition({
    x: dragState.value.originX + deltaX,
    y: dragState.value.originY + deltaY
  })
}

function onBubblePointerUp(event) {
  if (!dragState.value || event.pointerId !== dragState.value.pointerId) return
  cleanupDragEvents()
  dragState.value = null
  saveBubblePosition()
  if (!movedDuringDrag.value) {
    openChat()
  }
}

function onPanelPointerDown(event) {
  if (event.button !== 0) return
  if (event.target?.closest?.('.close-btn')) return
  if (event.target?.closest?.('.resize-handle')) return
  panelDragState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: panelPosition.value.x,
    originY: panelPosition.value.y
  }
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  cleanupPanelDragEvents()
  window.addEventListener('pointermove', onPanelPointerMove)
  window.addEventListener('pointerup', onPanelPointerUp)
  window.addEventListener('pointercancel', onPanelPointerUp)
}

function onPanelPointerMove(event) {
  if (!panelDragState.value || event.pointerId !== panelDragState.value.pointerId) return
  const deltaX = event.clientX - panelDragState.value.startX
  const deltaY = event.clientY - panelDragState.value.startY
  panelPosition.value = clampPanelPosition({
    x: panelDragState.value.originX + deltaX,
    y: panelDragState.value.originY + deltaY
  })
}

function onPanelPointerUp(event) {
  if (!panelDragState.value || event.pointerId !== panelDragState.value.pointerId) return
  cleanupPanelDragEvents()
  panelDragState.value = null
  savePanelState()
}

function onResizePointerDown(event, direction) {
  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  panelResizeState.value = {
    pointerId: event.pointerId,
    direction,
    startX: event.clientX,
    startY: event.clientY,
    originX: panelPosition.value.x,
    originY: panelPosition.value.y,
    originWidth: panelSize.value.width,
    originHeight: panelSize.value.height
  }
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  cleanupResizeEvents()
  window.addEventListener('pointermove', onResizePointerMove)
  window.addEventListener('pointerup', onResizePointerUp)
  window.addEventListener('pointercancel', onResizePointerUp)
}

function onResizePointerMove(event) {
  if (!panelResizeState.value || event.pointerId !== panelResizeState.value.pointerId) return
  const direction = panelResizeState.value.direction
  const deltaX = event.clientX - panelResizeState.value.startX
  const deltaY = event.clientY - panelResizeState.value.startY
  let left = panelResizeState.value.originX
  let top = panelResizeState.value.originY
  let right = panelResizeState.value.originX + panelResizeState.value.originWidth
  let bottom = panelResizeState.value.originY + panelResizeState.value.originHeight

  if (direction.includes('e')) {
    right = Math.min(
      viewport.value.width - PANEL_PADDING,
      Math.max(left + PANEL_MIN_WIDTH, right + deltaX)
    )
  }

  if (direction.includes('s')) {
    bottom = Math.min(
      viewport.value.height - PANEL_PADDING,
      Math.max(top + PANEL_MIN_HEIGHT, bottom + deltaY)
    )
  }

  if (direction.includes('w')) {
    left = Math.max(
      PANEL_PADDING,
      Math.min(right - PANEL_MIN_WIDTH, left + deltaX)
    )
  }

  if (direction.includes('n')) {
    top = Math.max(
      PANEL_PADDING,
      Math.min(bottom - PANEL_MIN_HEIGHT, top + deltaY)
    )
  }

  panelPosition.value = { x: left, y: top }
  panelSize.value = {
    width: right - left,
    height: bottom - top
  }
}

function onResizePointerUp(event) {
  if (!panelResizeState.value || event.pointerId !== panelResizeState.value.pointerId) return
  cleanupResizeEvents()
  panelResizeState.value = null
  savePanelState()
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function normalizeMessage(raw) {
  return {
    id: raw?.id ?? `${raw?.role || 'assistant'}-${Date.now()}`,
    role: raw?.role === 'user' ? 'user' : 'assistant',
    content: String(raw?.content || '').trim(),
    createdAt: raw?.createdAt || new Date().toISOString()
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInlineMarkdown(text) {
  const escaped = escapeHtml(text)
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function splitTableRow(line) {
  let row = String(line || '').trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|')) row = row.slice(0, -1)
  return row.split('|').map((cell) => cell.trim())
}

function isTableSeparator(line) {
  let row = String(line || '').trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|')) row = row.slice(0, -1)
  const parts = row.split('|').map((part) => part.trim())
  return parts.length >= 2 && parts.every((part) => /^:?-{3,}:?$/.test(part))
}

function renderTableBlock(lines) {
  if (lines.length < 2 || !isTableSeparator(lines[1])) return ''
  const headers = splitTableRow(lines[0])
  if (headers.length < 2) return ''

  const bodyRows = lines
    .slice(2)
    .filter((line) => line.trim())
    .map((line) => {
      const parsed = splitTableRow(line)
      return Array.from({ length: headers.length }, (_, index) => parsed[index] || '')
    })

  const headHtml = headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')
  const bodyHtml = bodyRows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`)
    .join('')

  return `<div class="md-table-wrap"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
}

function renderTextBlock(block) {
  const lines = block.split('\n').map((line) => line.trimEnd())
  const nonEmpty = lines.filter((line) => line.trim())
  if (!nonEmpty.length) return ''

  const isList = nonEmpty.every((line) => /^[-*]\s+/.test(line))
  if (isList) {
    const items = nonEmpty
      .map((line) => line.replace(/^[-*]\s+/, '').trim())
      .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
      .join('')
    return `<ul>${items}</ul>`
  }

  return `<p>${lines.map((line) => renderInlineMarkdown(line)).join('<br>')}</p>`
}

function renderRichContent(content) {
  const raw = String(content || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return ''

  return raw
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      if (lines.length >= 2 && lines[0].includes('|') && isTableSeparator(lines[1])) {
        const tableHtml = renderTableBlock(lines)
        if (tableHtml) return tableHtml
      }
      return renderTextBlock(block)
    })
    .filter(Boolean)
    .join('')
}

async function scrollToBottom() {
  await nextTick()
  if (!messagesRef.value) return
  messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

async function ensureConversation() {
  const listResponse = await fetch(buildAuthServerUrl('/api/ai/chat/conversations'), {
    credentials: 'include'
  })
  const listData = await listResponse.json().catch(() => ({}))
  if (!listResponse.ok) {
    throw new Error(listData?.error || 'Unable to load chat list.')
  }
  if (Array.isArray(listData) && listData.length > 0) {
    conversationId.value = listData[0].id
    return
  }

  const createResponse = await fetch(buildAuthServerUrl('/api/ai/chat/conversations'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title: 'New AI Coach Chat' })
  })
  const createData = await createResponse.json().catch(() => ({}))
  if (!createResponse.ok || !createData?.conversation?.id) {
    throw new Error(createData?.error || 'Unable to create chat.')
  }
  conversationId.value = createData.conversation.id
}

async function loadMessages() {
  if (!conversationId.value) return
  const response = await fetch(buildAuthServerUrl(`/api/ai/chat/messages?conversationId=${conversationId.value}`), {
    credentials: 'include'
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load messages.')
  }
  const incoming = Array.isArray(payload?.messages) ? payload.messages.map(normalizeMessage) : []
  messages.value = incoming
}

async function openChat() {
  panelPosition.value = clampPanelPosition(panelPosition.value, panelSize.value)
  isOpen.value = true
  errorMessage.value = ''
  loading.value = true
  if (!ensureAuthServerConfigured()) {
    loading.value = false
    return
  }
  try {
    await ensureConversation()
    await loadMessages()
    await scrollToBottom()
  } catch (error) {
    errorMessage.value = error?.message || 'Unable to open chat right now.'
  } finally {
    loading.value = false
  }
}

function closeChat() {
  isOpen.value = false
  errorMessage.value = ''
}

function onComposerKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

async function sendMessage() {
  const message = draftMessage.value.trim()
  if (!message || loading.value || sending.value) return
  if (!conversationId.value) {
    errorMessage.value = 'Conversation is not ready yet.'
    return
  }

  draftMessage.value = ''
  sending.value = true
  errorMessage.value = ''

  if (!ensureAuthServerConfigured()) {
    sending.value = false
    draftMessage.value = message
    return
  }

  const optimisticUserMessage = normalizeMessage({
    id: `tmp-user-${Date.now()}`,
    role: 'user',
    content: message,
    createdAt: new Date().toISOString()
  })
  messages.value.push(optimisticUserMessage)
  await scrollToBottom()

  try {
    const response = await fetch(buildAuthServerUrl('/api/ai/chat/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        conversationId: conversationId.value,
        message
      })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to send message.')
    }

    conversationId.value = payload?.conversationId || conversationId.value
    const resultUserMessage = normalizeMessage(payload?.userMessage)
    const resultAssistantMessage = normalizeMessage(payload?.assistantMessage)
    messages.value = messages.value.filter((item) => item.id !== optimisticUserMessage.id)
    messages.value.push(resultUserMessage, resultAssistantMessage)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pf_ai_agent_run'))
    }
    await scrollToBottom()
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== optimisticUserMessage.id)
    errorMessage.value = error?.message || 'Failed to send message.'
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pf_ai_agent_run'))
    }
  } finally {
    sending.value = false
  }
}

watch(bubbleStorageKey, () => {
  resetBubblePosition()
  resetPanelState()
  if (typeof window !== 'undefined') {
    hydrateCloudChatState()
  }
})

onMounted(() => {
  if (typeof window === 'undefined') return
  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  resetBubblePosition()
  resetPanelState()
  hydrateCloudChatState()
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  cleanupDragEvents()
  cleanupPanelDragEvents()
  cleanupResizeEvents()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', onWindowResize)
  }
})
</script>

<style scoped>
.coach-widget {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1300;
}

.chat-bubble {
  position: fixed;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #111827, #1f2937);
  color: #fff;
  font-size: 22px;
  display: grid;
  place-items: center;
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.24);
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  cursor: grab;
}

.chat-bubble:active {
  cursor: grabbing;
}

.chat-panel {
  position: fixed;
  min-width: 300px;
  min-height: 360px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow-strong);
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  pointer-events: auto;
  overflow: hidden;
}

.chat-header {
  padding: 14px 14px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.chat-header:active {
  cursor: grabbing;
}

.chat-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
}

.chat-header h2 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  border: none;
  border-radius: 10px;
  width: 32px;
  height: 32px;
  background: var(--surface-soft);
  color: var(--text-primary);
}

.chat-body {
  overflow: auto;
  padding: 14px;
  display: grid;
  gap: 10px;
  align-content: start;
}

.state-tip {
  margin: 6px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.chat-message {
  max-width: 88%;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  display: grid;
  gap: 6px;
}

.chat-content {
  line-height: 1.45;
}

.chat-content p {
  margin: 0;
  white-space: pre-wrap;
}

.chat-content ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}

.chat-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.08);
  padding: 1px 4px;
  border-radius: 4px;
}

.md-table-wrap {
  overflow-x: auto;
}

.md-table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.md-table-wrap th,
.md-table-wrap td {
  border: 1px solid var(--border);
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}

.md-table-wrap th {
  background: var(--surface-soft);
  font-weight: 700;
}

.chat-message time {
  font-size: 11px;
  color: var(--text-muted);
}

.chat-message.user {
  justify-self: end;
  background: var(--accent-soft);
  border-color: transparent;
}

.chat-message.assistant {
  justify-self: start;
  background: var(--surface-muted);
}

.chat-error {
  margin: 0;
  color: #b42318;
  background: #fee4e2;
  padding: 8px 12px;
  font-size: 12px;
  border-top: 1px solid #fecdca;
  border-bottom: 1px solid #fecdca;
}

.chat-composer {
  padding: 10px;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 8px;
  background: var(--surface);
}

.chat-composer textarea {
  width: 100%;
  resize: none;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface-muted);
  color: var(--text-primary);
}

.send-btn {
  justify-self: end;
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}

.send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.resize-handle {
  position: absolute;
  border: none;
  background: transparent;
  touch-action: none;
  z-index: 4;
  padding: 0;
}

.handle-n,
.handle-s {
  left: 18px;
  right: 18px;
  height: 10px;
}

.handle-n {
  top: 0;
  cursor: ns-resize;
}

.handle-s {
  bottom: 0;
  cursor: ns-resize;
}

.handle-e,
.handle-w {
  top: 18px;
  bottom: 18px;
  width: 10px;
}

.handle-e {
  right: 0;
  cursor: ew-resize;
}

.handle-w {
  left: 0;
  cursor: ew-resize;
}

.handle-ne,
.handle-nw,
.handle-se,
.handle-sw {
  width: 18px;
  height: 18px;
}

.handle-ne {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}

.handle-nw {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.handle-se {
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
}

.handle-sw {
  left: 0;
  bottom: 0;
  cursor: nesw-resize;
}

.handle-se::before,
.handle-sw::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  bottom: 4px;
  border-bottom: 2px solid rgba(71, 84, 103, 0.45);
}

.handle-se::before {
  right: 4px;
  border-right: 2px solid rgba(71, 84, 103, 0.45);
  border-bottom-right-radius: 4px;
}

.handle-sw::before {
  left: 4px;
  border-left: 2px solid rgba(71, 84, 103, 0.45);
  border-bottom-left-radius: 4px;
}

@media (max-width: 640px) {
  .chat-panel {
    min-width: 280px;
    min-height: 340px;
  }
}
</style>
