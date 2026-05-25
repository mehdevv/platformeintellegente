/** In dev, Vite proxies /__ai → VITE_AI_API_URL (no CORS). Production uses the public Railway URL. */
const baseUrl = () => {
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
        throw new Error(errBody.detail || res.statusText || 'AI request failed')
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
            if (!line.startsWith('data: ')) continue
            try {
                const payload = JSON.parse(line.slice(6))
                if (payload.type === 'token' && payload.text) onToken(payload.text)
                if (payload.type === 'done') onDone(payload)
            } catch {
                /* ignore partial JSON */
            }
        }
    }
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
