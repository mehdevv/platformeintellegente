/** Framer Motion presets for /ai — keep in sync with platform motionPresets where possible. */

const springSoft = { type: 'spring', stiffness: 220, damping: 26 }
const springSnappy = { type: 'spring', stiffness: 380, damping: 30 }
const easeSmooth = [0.22, 1, 0.36, 1]

export const aiPanelSwitch = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.28, ease: easeSmooth },
}

export const aiWelcomeStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
}

export const aiWelcomeItem = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: springSoft },
}

export const aiWelcomeIcon = {
    hidden: { opacity: 0, scale: 0.85, rotate: -8 },
    visible: { opacity: 1, scale: 1, rotate: 0, transition: { ...springSoft, delay: 0.05 } },
}

export const aiHeaderEnter = {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: easeSmooth },
}

export const aiSidebarSection = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.25 },
}

export const aiChatListStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
}

export const aiChatListItem = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: springSoft },
    exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
}

export const aiBubbleUser = {
    initial: { opacity: 0, x: 20, scale: 0.96 },
    animate: { opacity: 1, x: 0, scale: 1 },
    transition: springSoft,
}

export const aiBubbleAssistant = {
    initial: { opacity: 0, x: -16, scale: 0.96 },
    animate: { opacity: 1, x: 0, scale: 1 },
    transition: springSoft,
}

export const aiAvatarPop = {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    transition: springSnappy,
}

export const aiSourceChipVariant = {
    hidden: { opacity: 0, y: 6, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: springSoft },
}

export const aiChatBarEnter = {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { ...springSoft, delay: 0.08 },
}

export const aiChatBarFocus = {
    rest: {
        boxShadow: '0 12px 40px rgba(26, 35, 50, 0.12), 0 2px 8px rgba(26, 35, 50, 0.05)',
        borderColor: 'rgba(226, 232, 240, 0.95)',
    },
    focus: {
        boxShadow: '0 16px 48px rgba(25, 127, 148, 0.18), 0 0 0 1px rgba(25, 127, 148, 0.25)',
        borderColor: 'rgba(25, 127, 148, 0.45)',
        transition: springSoft,
    },
}

export const aiSendButton = {
    rest: { scale: 1 },
    hover: { scale: 1.06 },
    tap: { scale: 0.92 },
    transition: springSnappy,
}

export const aiTypingPulse = {
    animate: {
        opacity: [0.35, 1, 0.35],
        scale: [0.92, 1, 0.92],
    },
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
}

export const aiAlertSlide = {
    initial: { opacity: 0, y: -8, height: 0 },
    animate: { opacity: 1, y: 0, height: 'auto' },
    exit: { opacity: 0, y: -6, height: 0 },
    transition: springSoft,
}

export const aiLoadingFade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
}

export const aiNewChatButton = {
    whileHover: { scale: 1.02, boxShadow: '0 8px 24px rgba(25, 127, 148, 0.28)' },
    whileTap: { scale: 0.98 },
    transition: springSnappy,
}
