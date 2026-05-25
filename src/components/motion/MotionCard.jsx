import React from 'react'
import { motion } from 'framer-motion'
import { cardHoverLift } from './motionPresets'

/**
 * Interactive card lift — wrap MUI Card or any block.
 * @param {boolean} [disableHover]
 */
export default function MotionCard({ children, className, style, disableHover = false, sx, ...rest }) {
    if (disableHover) {
        return (
            <motion.div className={className} style={style} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
                {children}
            </motion.div>
        )
    }

    return (
        <motion.div
            className={className}
            style={{ height: '100%', ...style }}
            initial="rest"
            animate="rest"
            whileHover="hover"
            whileTap={{ scale: 0.995 }}
            variants={cardHoverLift}
            {...rest}
        >
            {children}
        </motion.div>
    )
}
