import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { pageEnter } from './motionPresets'
import { getRouteTransitionKey } from './useRouteTransitionKey'

/** Top-level route transitions for the whole app. */
export default function SiteMotionShell() {
    const location = useLocation()
    const outlet = useOutlet()
    const key = getRouteTransitionKey(location.pathname)

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div key={key} style={{ minHeight: '100%', width: '100%' }} {...pageEnter}>
                {outlet}
            </motion.div>
        </AnimatePresence>
    )
}
