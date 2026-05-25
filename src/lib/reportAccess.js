import { activeEntitlementsOrFilter, isEntitlementActive } from './accountActions'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} userId
 */
export async function fetchUserOwnedReportAccess(supabase, userId) {
    if (!supabase || !userId) {
        return { ownedReportIds: new Set(), ownedSectorIds: new Set() }
    }
    const { data, error } = await supabase
        .from('user_report_entitlements')
        .select('report_id, sector_id, expires_at')
        .eq('user_id', userId)
        .or(activeEntitlementsOrFilter())
    if (error) {
        console.error('fetchUserOwnedReportAccess', error)
        return { ownedReportIds: new Set(), ownedSectorIds: new Set() }
    }
    return buildOwnedReportAccess(data || [])
}

/**
 * @param {Array<{ report_id?: string, sector_id?: string, expires_at?: string | null }>} entitlements
 */
export function buildOwnedReportAccess(entitlements) {
    const ownedReportIds = new Set()
    const ownedSectorIds = new Set()
    for (const row of entitlements || []) {
        if (!isEntitlementActive(row)) continue
        if (row.report_id) ownedReportIds.add(row.report_id)
        if (row.sector_id) ownedSectorIds.add(row.sector_id)
    }
    return { ownedReportIds, ownedSectorIds }
}

/**
 * @param {{ id: string, sector_id?: string | null }} report
 * @param {{ ownedReportIds: Set<string>, ownedSectorIds: Set<string> }} access
 */
export function isReportOwned(report, access) {
    if (!report?.id || !access) return false
    if (access.ownedReportIds.has(report.id)) return true
    if (report.sector_id && access.ownedSectorIds.has(report.sector_id)) return true
    return false
}
