/**
 * Admin AI settings (`platform_settings.ai_settings`) and public user limits (`ai_user_limits`).
 */

export const AI_SETTINGS_KEY = 'ai_settings'
export const AI_USER_LIMITS_KEY = 'ai_user_limits'

export const PLAN_TIERS = ['default', 'simple', 'premium', 'corporate']

export const DEFAULT_AI_SETTINGS = {
    chat_enabled: true,
    groq_chat_model: '',
    temperature: 0.3,
    rag_top_k: 8,
    rag_max_context_chars: 24_000,
    web_search_enabled: true,
    web_search_max_results: 6,
    web_search_max_context_chars: 12_000,
    charts_enabled: true,
    message_limits: {
        default: 15,
        simple: 50,
        premium: 500,
        corporate: null,
    },
}

function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(String(value), 10)
    if (Number.isNaN(n)) return fallback
    return Math.min(max, Math.max(min, n))
}

function clampFloat(value, min, max, fallback) {
    const n = Number.parseFloat(String(value))
    if (Number.isNaN(n)) return fallback
    return Math.min(max, Math.max(min, n))
}

/** @param {unknown} raw */
export function normalizeAiSettings(raw) {
    const base = structuredClone(DEFAULT_AI_SETTINGS)
    if (!raw || typeof raw !== 'object') return base
    const o = /** @type {Record<string, unknown>} */ (raw)
    base.chat_enabled = o.chat_enabled !== false
    base.groq_chat_model = typeof o.groq_chat_model === 'string' ? o.groq_chat_model.trim() : ''
    base.temperature = clampFloat(o.temperature, 0, 1, base.temperature)
    base.rag_top_k = clampInt(o.rag_top_k, 1, 24, base.rag_top_k)
    base.rag_max_context_chars = clampInt(o.rag_max_context_chars, 4000, 80_000, base.rag_max_context_chars)
    base.web_search_enabled = o.web_search_enabled !== false
    base.web_search_max_results = clampInt(o.web_search_max_results, 1, 12, base.web_search_max_results)
    base.web_search_max_context_chars = clampInt(
        o.web_search_max_context_chars,
        2000,
        40_000,
        base.web_search_max_context_chars,
    )
    base.charts_enabled = o.charts_enabled !== false
    const limits = o.message_limits && typeof o.message_limits === 'object' ? o.message_limits : {}
    for (const tier of PLAN_TIERS) {
        const v = limits[tier]
        if (v === null || v === undefined || v === '') {
            base.message_limits[tier] = tier === 'corporate' ? null : base.message_limits[tier]
        } else {
            const n = Number.parseInt(String(v), 10)
            base.message_limits[tier] = Number.isNaN(n) ? base.message_limits[tier] : Math.max(0, n)
        }
    }
    return base
}

/** @param {import('@supabase/supabase-js').SupabaseClient | null} supabase */
export async function getAiSettings(supabase) {
    if (!supabase) return normalizeAiSettings(null)
    const { data, error } = await supabase
        .from('platform_settings')
        .select('value, updated_at')
        .eq('key', AI_SETTINGS_KEY)
        .maybeSingle()
    if (error) throw new Error(error.message)
    return { settings: normalizeAiSettings(data?.value), updated_at: data?.updated_at || null }
}

/** Public limits for signed-in users (RLS). */
export async function getAiUserLimits(supabase) {
    if (!supabase) {
        return {
            chat_enabled: DEFAULT_AI_SETTINGS.chat_enabled,
            message_limits: { ...DEFAULT_AI_SETTINGS.message_limits },
        }
    }
    const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', AI_USER_LIMITS_KEY)
        .maybeSingle()
    if (error) {
        console.error('getAiUserLimits', error)
        return {
            chat_enabled: DEFAULT_AI_SETTINGS.chat_enabled,
            message_limits: { ...DEFAULT_AI_SETTINGS.message_limits },
        }
    }
    const v = data?.value
    const limits =
        v?.message_limits && typeof v.message_limits === 'object'
            ? { ...DEFAULT_AI_SETTINGS.message_limits, ...v.message_limits }
            : { ...DEFAULT_AI_SETTINGS.message_limits }
    return {
        chat_enabled: v?.chat_enabled !== false,
        message_limits: limits,
    }
}

export function buildAiUserLimitsPayload(settings) {
    return {
        chat_enabled: settings.chat_enabled,
        message_limits: settings.message_limits,
    }
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function saveAiSettings(supabase, settings) {
    const payload = normalizeAiSettings(settings)
    const now = new Date().toISOString()
    const { error: e1 } = await supabase
        .from('platform_settings')
        .upsert({ key: AI_SETTINGS_KEY, value: payload, updated_at: now }, { onConflict: 'key' })
    if (e1) throw new Error(e1.message)
    const { error: e2 } = await supabase.from('platform_settings').upsert(
        {
            key: AI_USER_LIMITS_KEY,
            value: buildAiUserLimitsPayload(payload),
            updated_at: now,
        },
        { onConflict: 'key' },
    )
    if (e2) throw new Error(e2.message)
    return payload
}

export function getMessageLimitForPlan(planTier, messageLimits) {
    const limits = messageLimits || DEFAULT_AI_SETTINGS.message_limits
    if (!planTier) return limits.default ?? 15
    const key = String(planTier).toLowerCase()
    if (key in limits) return limits[key]
    return limits.default ?? 15
}
