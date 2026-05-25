/**
 * Fresh access token for Railway API calls (refreshes expired JWT when possible).
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 */
export async function getFreshAccessToken(supabase) {
    if (!supabase) return null
    const { data, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message)
    return data.session?.access_token ?? null
}
