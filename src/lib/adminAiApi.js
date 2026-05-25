import { baseUrl as aiBaseUrl } from './aiApi'

async function staffFetch(path, getAccessToken) {
    const token = await getAccessToken()
    if (!token) throw new Error('Sign in as staff.')

    const res = await fetch(`${aiBaseUrl()}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.detail || res.statusText || 'Request failed')
    return body
}

/** @param {() => Promise<string | null | undefined>} getAccessToken */
export function fetchAdminAiOverview(getAccessToken) {
    return staffFetch('/v1/admin/ai/overview', getAccessToken)
}
