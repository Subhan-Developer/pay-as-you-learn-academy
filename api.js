// Same-origin /api in dev (Vite proxy) and when UI is served from Express after `npm run build`.
const API_BASE = import.meta.env.VITE_API_BASE || ''

async function apiRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data && data.error ? data.error : `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export function getUser(userId) {
  return apiRequest(`/api/user/${encodeURIComponent(userId)}`)
}

export function getModules(userId) {
  return apiRequest(`/api/modules?userId=${encodeURIComponent(userId)}`)
}

/** @param {number} moduleId */
export function getCourseArticles(moduleId) {
  return apiRequest(`/api/modules/${encodeURIComponent(moduleId)}/articles`)
}

export function purchaseLesson({ userId, moduleId }) {
  return apiRequest('/api/purchase', { method: 'POST', body: { userId, moduleId } })
}

export function completeLesson({ userId, moduleId }) {
  return apiRequest('/api/complete', { method: 'POST', body: { userId, moduleId } })
}

export function getRecommendation(userId) {
  return apiRequest(`/api/recommend/${encodeURIComponent(userId)}`)
}

export function getTransactions(userId) {
  return apiRequest(`/api/transactions/${encodeURIComponent(userId)}`)
}

export function aiChat({ userId, message, lesson }) {
  return apiRequest('/api/ai/chat', { method: 'POST', body: { userId, message, lesson } })
}

export function getRecommendations(userId) {
  return apiRequest(`/api/recommendations?userId=${encodeURIComponent(userId)}`)
}

