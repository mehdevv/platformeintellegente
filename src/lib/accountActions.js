/** @param {import('@supabase/supabase-js').SupabaseClient | null} supabase */
export async function updateAccountEmail(supabase, email) {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.auth.updateUser({ email: email.trim() })
}

/** @param {import('@supabase/supabase-js').SupabaseClient | null} supabase */
export async function updateAccountPassword(supabase, password) {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.auth.updateUser({ password })
}

/** @param {import('@supabase/supabase-js').SupabaseClient | null} supabase */
export async function exportPersonalData(supabase, userId) {
    if (!supabase || !userId) return { error: new Error('Not signed in.') }

    const [profile, entitlements, payments, usage, search] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase
            .from('user_report_entitlements')
            .select('id, report_id, sector_id, source, granted_at, expires_at, notes, reports(title, slug), sectors(name, slug)')
            .eq('user_id', userId),
        supabase
            .from('payment_requests')
            .select('id, kind, status, amount_cents, currency, created_at, reviewed_at, admin_note')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(500),
        supabase
            .from('usage_events')
            .select('id, event_type, report_id, created_at, metadata')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(2000),
        supabase
            .from('user_search_history')
            .select('id, query, filters, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(500),
    ])

    const errors = [profile.error, entitlements.error, payments.error, usage.error, search.error].filter(Boolean)
    if (errors.length) return { error: errors[0] }

    return {
        data: {
            exported_at: new Date().toISOString(),
            profile: profile.data,
            entitlements: entitlements.data,
            payment_requests: payments.data,
            usage_events: usage.data,
            search_history: search.data,
        },
    }
}

/** @param {import('@supabase/supabase-js').SupabaseClient | null} supabase */
export async function deleteOwnAccount(supabase) {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.rpc('delete_own_account')
}

/** @param {import('@supabase/supabase-js').SupabaseClient | null} supabase */
export async function cancelPlatformSubscription(supabase) {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.rpc('cancel_my_platform_subscription')
}

/** @param {import('@supabase/supabase-js').SupabaseClient | null} supabase */
export async function cancelSectorAccess(supabase, entitlementId) {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.rpc('cancel_my_sector_access', { p_entitlement_id: entitlementId })
}

/** @param {{ expires_at?: string | null }} row */
export function isEntitlementActive(row) {
    if (!row) return false
    if (!row.expires_at) return true
    const expiresMs = new Date(row.expires_at).getTime()
    if (Number.isNaN(expiresMs)) return false
    return expiresMs > Date.now()
}

/** PostgREST `.or()` filter: only rows that are still active (matches `has_report_entitlement`). */
export function activeEntitlementsOrFilter(now = new Date()) {
    return `expires_at.is.null,expires_at.gt.${now.toISOString()}`
}

export function formatPlanTier(tier) {
    if (!tier) return '—'
    return tier.charAt(0).toUpperCase() + tier.slice(1)
}
