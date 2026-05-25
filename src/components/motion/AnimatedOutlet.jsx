import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { nestedPageEnter } from './motionPresets'

/** Nested layout transitions (dashboard / admin tabs). */
export default function AnimatedOutlet() {
    const location = useLocation()
    const outlet = useOutlet()

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} style={{ minHeight: '100%', width: '100%' }} {...nestedPageEnter}>
                {outlet}
            </motion.div>
        </AnimatePresence>
    )
}
