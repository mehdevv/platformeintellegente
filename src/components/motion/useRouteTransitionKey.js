/**
 * Stable keys for AnimatePresence — animate between major sections,
 * not every nested dashboard/admin tab (avoids sidebar remounting).
 */
export function getRouteTransitionKey(pathname) {
    if (pathname.startsWith('/admin/login')) return '/admin-auth'
    if (pathname.startsWith('/admin')) return '/admin'
    if (pathname.startsWith('/dashboard')) return '/dashboard'
    if (pathname.startsWith('/ai')) return '/ai'
    if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password')) {
        return '/auth'
    }
    return pathname
}
