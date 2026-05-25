import React from 'react'
import { motion } from 'framer-motion'
import Box from '@mui/material/Box'
import {
    fadeInScale,
    fadeInUp,
    fadeInUpDelayed,
    fadeInUpInView,
    heroImageReveal,
    heroItem,
    heroStagger,
    layoutSpring,
    revealFromLeft,
    revealFromRight,
    staggerContainer,
    staggerItem,
    viewportOnce,
} from './motionPresets'

export {
    fadeInUpInView,
    heroStagger,
    heroItem,
    staggerContainer,
    staggerItem,
    viewportOnce,
} from './motionPresets'

export function MotionInView({ children, delay = 0, className, style }) {
    return (
        <motion.div className={className} style={style} {...fadeInUpInView(delay)}>
            {children}
        </motion.div>
    )
}

export function MotionFadeInUp({ children, delay = 0, className, style }) {
    const props = delay > 0 ? fadeInUpDelayed(delay) : fadeInUp
    return (
        <motion.div className={className} style={style} {...props}>
            {children}
        </motion.div>
    )
}

export function MotionFadeInScale({ children, className, style }) {
    return (
        <motion.div className={className} style={style} {...fadeInScale}>
            {children}
        </motion.div>
    )
}

export function MotionStagger({ children, className, style, viewport = viewportOnce }) {
    return (
        <motion.div
            className={className}
            style={style}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer}
        >
            {children}
        </motion.div>
    )
}

export function MotionStaggerItem({ children, className, style }) {
    return (
        <motion.div className={className} style={style} variants={staggerItem} initial={false}>
            {children}
        </motion.div>
    )
}

export function MotionLayout({ children, layoutId, className, style }) {
    return (
        <motion.div className={className} style={style} layout layoutId={layoutId} transition={layoutSpring.transition}>
            {children}
        </motion.div>
    )
}

export function MotionSection({ children, delay = 0, sx, component = 'div', ...rest }) {
    return (
        <MotionInView delay={delay}>
            <Box component={component} sx={sx} {...rest}>
                {children}
            </Box>
        </MotionInView>
    )
}

/** Hero column: staggered headline, search, tags */
export function MotionHeroStagger({ children, className, style }) {
    return (
        <motion.div
            className={className}
            style={style}
            initial="hidden"
            animate="visible"
            variants={heroStagger}
        >
            {children}
        </motion.div>
    )
}

export function MotionHeroItem({ children, className, style }) {
    return (
        <motion.div className={className} style={style} variants={heroItem}>
            {children}
        </motion.div>
    )
}

export function MotionHeroImage({ children, className, style }) {
    return (
        <motion.div
            className={className}
            style={style}
            initial="hidden"
            animate="visible"
            variants={heroImageReveal}
        >
            {children}
        </motion.div>
    )
}

export function MotionRevealLeft({ children, className, style, delay = 0 }) {
    return (
        <motion.div className={className} style={style} {...revealFromLeft} transition={{ ...revealFromLeft.transition, delay }}>
            {children}
        </motion.div>
    )
}

export function MotionRevealRight({ children, className, style, delay = 0 }) {
    return (
        <motion.div className={className} style={style} {...revealFromRight} transition={{ ...revealFromRight.transition, delay }}>
            {children}
        </motion.div>
    )
}

export { default as MotionPage } from './MotionPage'
export { default as MotionCard } from './MotionCard'
export { default as MotionNavLink } from './MotionNavLink'
