import { fetchUserOwnedReportAccess } from './reportAccess'

export function titleFromMessage(text) {
    const t = (text || '').trim().replace(/\s+/g, ' ')
    if (!t) return 'New chat'
    return t.length > 48 ? `${t.slice(0, 45)}…` : t
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} userId
 */
export async function listAiConversations(supabase, userId) {
    if (!supabase || !userId) return { data: [], error: null }
    return supabase
        .from('ai_conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(60)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} conversationId
 */
export async function loadAiMessages(supabase, conversationId) {
    if (!supabase || !conversationId) return { data: [], error: null }
    return supabase
        .from('ai_messages')
        .select('id, role, content, citations, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} userId
 * @param {string} [title]
 */
export async function createAiConversation(supabase, userId, title = 'New chat') {
    if (!supabase || !userId) return { data: null, error: new Error('Not signed in.') }
    return supabase
        .from('ai_conversations')
        .insert({ user_id: userId, title })
        .select('id, title, created_at, updated_at')
        .single()
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} conversationId
 * @param {string} title
 */
export async function updateAiConversationTitle(supabase, conversationId, title) {
    if (!supabase || !conversationId) return { error: null }
    return supabase
        .from('ai_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} conversationId
 */
export async function touchAiConversation(supabase, conversationId) {
    if (!supabase || !conversationId) return
    await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {{ conversationId: string, role: string, content: string, citations?: unknown[] }} row
 */
export async function saveAiMessage(supabase, { conversationId, role, content, citations }) {
    if (!supabase || !conversationId) return { data: null, error: new Error('No conversation.') }
    return supabase
        .from('ai_messages')
        .insert({
            conversation_id: conversationId,
            role: role === 'assistant' ? 'assistant' : 'user',
            content,
            citations: citations?.length ? citations : null,
        })
        .select('id, role, content, citations, created_at')
        .single()
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} conversationId
 */
export async function deleteAiConversation(supabase, conversationId) {
    if (!supabase || !conversationId) return { error: null }
    return supabase.from('ai_conversations').delete().eq('id', conversationId)
}

/** @param {{ id: string, role: string, content: string, citations?: unknown[] | null }} row */
export function mapDbMessageToUi(row) {
    const citations = Array.isArray(row.citations) ? row.citations : []
    return {
        id: row.id,
        role: row.role === 'user' ? 'user' : 'assistant',
        content: row.content || '',
        sources: citations,
        streaming: false,
        animating: false,
    }
}

function formatChatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const sameDay =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
    if (sameDay) {
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export { formatChatDate }

/**
 * Approximate count of reports the user can query (direct + sector subscriptions).
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} userId
 */
export async function fetchLibrarySourcesCount(supabase, userId) {
    if (!supabase || !userId) return 0
    const { ownedReportIds, ownedSectorIds } = await fetchUserOwnedReportAccess(supabase, userId)
    let total = ownedReportIds.size
    if (ownedSectorIds.size > 0) {
        const { count, error } = await supabase
            .from('reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published')
            .in('sector_id', Array.from(ownedSectorIds))
        if (!error && count != null) total += count
    }
    return total
}
