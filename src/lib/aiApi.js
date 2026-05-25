function formatApiError(body, fallback) {
    const detail = body?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail)) {
        return detail.map(d => d?.msg || JSON.stringify(d)).filter(Boolean).join(' · ') || fallback
    }
    return fallback || 'AI request failed'
}

/** In dev, Vite proxies /__ai → VITE_AI_API_URL (no CORS). Production uses the public Railway URL. */
export const baseUrl = () => {
    if (import.meta.env.DEV) {
        return '/__ai'
    }
    const url = import.meta.env.VITE_AI_API_URL
    if (!url) throw new Error('VITE_AI_API_URL is not set for production builds.')
    return url.replace(/\/$/, '')
}

/**
 * @param {() => Promise<string | null | undefined>} getAccessToken
 */
export async function sendAiChat({ message, history = [], stream = true, getAccessToken }) {
    const token = await getAccessToken()
    if (!token) throw new Error('Sign in to use the AI assistant.')

    const res = await fetch(`${baseUrl()}/v1/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, history, stream }),
    })

    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(formatApiError(errBody, res.statusText))
    }

    if (!stream) {
        return res.json()
    }

    return res
}

/**
 * Parse SSE stream from /v1/chat (stream=true).
 * @param {Response} response
 * @param {{ onToken: (t: string) => void, onDone: (meta: object) => void }} handlers
 */
function parseSseLine(line, { onToken, onDone }) {
    if (!line.startsWith('data: ')) return
    let payload
    try {
        payload = JSON.parse(line.slice(6))
    } catch {
        return
    }
    if (payload.type === 'token' && payload.text) onToken(payload.text)
    if (payload.type === 'done') onDone(payload)
    if (payload.type === 'error' && payload.detail) {
        throw new Error(payload.detail)
    }
}

export async function consumeAiChatStream(response, { onToken, onDone }) {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
            parseSseLine(line.trim(), { onToken, onDone })
        }
    }
    if (buffer.trim()) {
        parseSseLine(buffer.trim(), { onToken, onDone })
    }
}

/** Non-streaming chat (reliable fallback when SSE yields no tokens). */
export async function sendAiChatJson({ message, history = [], getAccessToken }) {
    const token = await getAccessToken()
    if (!token) throw new Error('Sign in to use the AI assistant.')

    const res = await fetch(`${baseUrl()}/v1/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, history, stream: false }),
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(formatApiError(body, res.statusText))
    return body
}

/**
 * @param {() => Promise<string | null | undefined>} getAccessToken
 */
export async function triggerReportIngest(reportId, getAccessToken) {
    const token = await getAccessToken()
    if (!token) throw new Error('Sign in required. Sign out and sign in again.')

    const res = await fetch(`${baseUrl()}/v1/reports/${reportId}/ingest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.detail || res.statusText || 'Ingest failed')
    return body
}

/**
 * @param {() => Promise<string | null | undefined>} getAccessToken
 */
export async function fetchIngestStatus(reportId, getAccessToken) {
    const token = await getAccessToken()
    if (!token) return null
    const res = await fetch(`${baseUrl()}/v1/reports/${reportId}/ingest/status`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
}

export function isAiApiConfigured() {
    return Boolean(import.meta.env.DEV || import.meta.env.VITE_AI_API_URL)
}
