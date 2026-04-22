export async function fetchWithTimeout(resource, options = {}, timeoutMs = 10000, label = 'Request') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${label} timed out after ${timeoutMs}ms.`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchJsonWithTimeout(resource, options = {}, timeoutMs = 10000, label = 'Request') {
  const response = await fetchWithTimeout(resource, options, timeoutMs, label)
  const data = await response.json().catch(() => ({}))
  return { response, data }
}
