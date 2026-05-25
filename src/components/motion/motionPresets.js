/** Shared Framer Motion presets — keep animations consistent across the app. */

const springSoft = { type: 'spring', stiffness: 200, damping: 22 }
const springBouncy = { type: 'spring', bounce: 0.35, duration: 0.75 }
const springGentle = { type: 'spring', stiffness: 140, damping: 26 }
const easeOut = [0.22, 1, 0.36, 1]

export const viewportOnce = { once: true, margin: '-56px 0px -56px 0px', amount: 0.15 }
export const viewportHero = { once: true, amount: 0.35 }

export const fadeInUp = {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: springSoft,
}

export function fadeInUpDelayed(delay = 0.1) {
    return {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: { ...springSoft, delay },
    }
}

export function fadeInUpInView(delay = 0) {
    return {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: viewportOnce,
        transition: { ...springSoft, delay },
    }
}

export const fadeInScale = {
    initial: { opacity: 0, scale: 0.92, y: 16 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: springBouncy,
}

export const staggerContainer = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.1, delayChildren: 0.06 },
    },
}

export const staggerItem = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: springSoft },
}

export const heroStagger = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.09, delayChildren: 0.12 },
    },
}

export const heroItem = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: springGentle },
}

export const heroImageReveal = {
    hidden: { opacity: 0, x: 48, scale: 0.94 },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { ...springGentle, delay: 0.18 },
    },
}

export const revealFromLeft = {
    initial: { opacity: 0, x: -32 },
    whileInView: { opacity: 1, x: 0 },
    viewport: viewportOnce,
    transition: springGentle,
}

export const revealFromRight = {
    initial: { opacity: 0, x: 32 },
    whileInView: { opacity: 1, x: 0 },
    viewport: viewportOnce,
    transition: springGentle,
}

export const cardHoverLift = {
    rest: { y: 0, boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)' },
    hover: {
        y: -6,
        boxShadow: '0 16px 40px rgba(25, 127, 148, 0.14)',
        transition: springSoft,
    },
}

export const layoutSpring = { transition: { type: 'spring', stiffness: 320, damping: 32 } }

export const pageEnter = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
}

export const chatMessageUser = {
    initial: { opacity: 0, x: 16, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    transition: springSoft,
}

export const chatMessageAi = {
    initial: { opacity: 0, x: -12, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    transition: springSoft,
}

export const tapScale = { scale: 0.97 }
export const tapScaleTransition = { type: 'spring', stiffness: 400, damping: 28 }

export const drawerBackdrop = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
}

export const listItemEnter = {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    transition: springSoft,
}

export const pageHeaderEnter = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { ...springSoft, duration: 0.45 },
}

export const nestedPageEnter = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: 0.2, ease: easeOut },
}

export const headerSlide = {
    visible: { y: 0 },
    hidden: { y: -72 },
}
