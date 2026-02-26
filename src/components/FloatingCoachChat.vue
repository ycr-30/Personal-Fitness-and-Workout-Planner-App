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
          <p>{{ item.content }}</p>
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
        class="resize-handle"
        type="button"
        aria-label="Resize chat window"
        @pointerdown="onResizePointerDown"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const AUTH_SERVER_ORIGIN = import.meta.env.VITE_AUTH_SERVER_ORIGIN || 'http://localhost:4000'
const BUBBLE_SIZE = 58
const BUBBLE_PADDING = 10
const PANEL_MIN_WIDTH = 300
const PANEL_MIN_HEIGHT = 360
const PANEL_DEFAULT_WIDTH = 380
const PANEL_DEFAULT_HEIGHT = 560
const PANEL_PADDING = 12

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
    x: Math.max(BUBBLE_PADDING, viewport.value.width - BUBBLE_SIZE - 24),
    y: Math.max(BUBBLE_PADDING, viewport.value.height - BUBBLE_SIZE - 24)
  }
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

function onResizePointerDown(event) {
  if (event.button !== 0) return
  panelResizeState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
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
  const deltaX = event.clientX - panelResizeState.value.startX
  const deltaY = event.clientY - panelResizeState.value.startY
  panelSize.value = clampPanelSize({
    width: panelResizeState.value.originWidth + deltaX,
    height: panelResizeState.value.originHeight + deltaY
  })
  panelPosition.value = clampPanelPosition(panelPosition.value, panelSize.value)
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

async function scrollToBottom() {
  await nextTick()
  if (!messagesRef.value) return
  messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

async function ensureConversation() {
  const listResponse = await fetch(`${AUTH_SERVER_ORIGIN}/api/ai/chat/conversations`, {
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

  const createResponse = await fetch(`${AUTH_SERVER_ORIGIN}/api/ai/chat/conversations`, {
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
  const response = await fetch(
    `${AUTH_SERVER_ORIGIN}/api/ai/chat/messages?conversationId=${conversationId.value}`,
    {
      credentials: 'include'
    }
  )
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

  const optimisticUserMessage = normalizeMessage({
    id: `tmp-user-${Date.now()}`,
    role: 'user',
    content: message,
    createdAt: new Date().toISOString()
  })
  messages.value.push(optimisticUserMessage)
  await scrollToBottom()

  try {
    const response = await fetch(`${AUTH_SERVER_ORIGIN}/api/ai/chat/messages`, {
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
    await scrollToBottom()
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== optimisticUserMessage.id)
    errorMessage.value = error?.message || 'Failed to send message.'
  } finally {
    sending.value = false
  }
}

watch(bubbleStorageKey, () => {
  resetBubblePosition()
  resetPanelState()
})

onMounted(() => {
  if (typeof window === 'undefined') return
  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  resetBubblePosition()
  resetPanelState()
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
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #111827, #1f2937);
  color: #fff;
  font-size: 26px;
  display: grid;
  place-items: center;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.28);
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

.chat-message p {
  margin: 0;
  line-height: 1.45;
  white-space: pre-wrap;
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
  right: 6px;
  bottom: 6px;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  cursor: nwse-resize;
  touch-action: none;
}

.resize-handle::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    transparent 0 40%,
    rgba(71, 84, 103, 0.4) 40% 52%,
    transparent 52% 68%,
    rgba(71, 84, 103, 0.6) 68% 80%,
    transparent 80%
  );
}

@media (max-width: 640px) {
  .chat-panel {
    min-width: 280px;
    min-height: 340px;
  }
}
</style>
