import { DEFAULT_AI_SETTINGS, getAiUserLimits, getMessageLimitForPlan } from './aiPlatformSettings'

export { getMessageLimitForPlan as getAiMessageLimit }

export function startOfCurrentMonthIso() {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 */
export async function fetchAiUsageState(supabase, userId, planTier) {
    const limitsRow = await getAiUserLimits(supabase)
    const used = await fetchMonthlyAiMessageCount(supabase, userId)
    const limit = getMessageLimitForPlan(planTier, limitsRow.message_limits)
    return {
        chat_enabled: limitsRow.chat_enabled,
        used,
        limit,
        unlimited: limit == null,
    }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} userId
 */
export async function fetchMonthlyAiMessageCount(supabase, userId) {
    if (!supabase || !userId) return 0
    const { count, error } = await supabase
        .from('usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'ai_message')
        .gte('created_at', startOfCurrentMonthIso())
    if (error) {
        console.error('fetchMonthlyAiMessageCount', error)
        return 0
    }
    return count || 0
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} userId
 * @param {{ conversationId?: string, sourcesCount?: number }} meta
 */
export async function recordAiMessageUsage(supabase, userId, meta = {}) {
    if (!supabase || !userId) return
    const { error } = await supabase.from('usage_events').insert({
        user_id: userId,
        event_type: 'ai_message',
        metadata: meta,
    })
    if (error) console.error('recordAiMessageUsage', error)
}

/** @deprecated use fetchAiUsageState */
export const AI_MESSAGE_LIMITS = DEFAULT_AI_SETTINGS.message_limits
