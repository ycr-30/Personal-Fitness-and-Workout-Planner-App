const AUTH_SERVER_ORIGIN = import.meta.env.VITE_AUTH_SERVER_ORIGIN || 'http://localhost:4000'

function normalizeAgentType(value) {
  const text = String(value || '').trim().toLowerCase()
  return ['chat', 'analytics', 'nutrition'].includes(text) ? text : ''
}

function normalizeLatencyMs(value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  return Math.min(parsed, 10 * 60 * 1000)
}

function normalizeErrorMessage(value) {
  const text = String(value || '').trim()
  return text ? text.slice(0, 500) : null
}

export async function recordAiAgentRun({
  agentType = '',
  success = false,
  usedFallback = false,
  latencyMs = null,
  errorMessage = null
} = {}) {
  const normalizedAgentType = normalizeAgentType(agentType)
  if (!normalizedAgentType) return

  try {
    const response = await fetch(`${AUTH_SERVER_ORIGIN}/api/ai/agent-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        agentType: normalizedAgentType,
        success: Boolean(success),
        usedFallback: Boolean(usedFallback),
        latencyMs: normalizeLatencyMs(latencyMs),
        errorMessage: normalizeErrorMessage(errorMessage)
      })
    })

    if (!response.ok) return

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pf_ai_agent_run'))
    }
  } catch (error) {
    // Metrics should never interrupt the primary UX flow.
  }
}
