import React from 'react'
import { motion } from 'framer-motion'
import { pageHeaderEnter } from './motionPresets'

/** Wrap page main content for a smooth mount (use inside pages that own Header/Footer). */
export default function MotionPage({ children, className, style, delay = 0 }) {
    return (
        <motion.div
            className={className}
            style={style}
            initial={pageHeaderEnter.initial}
            animate={pageHeaderEnter.animate}
            transition={{ ...pageHeaderEnter.transition, delay }}
        >
            {children}
        </motion.div>
    )
}
