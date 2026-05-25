import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import MicIcon from '@mui/icons-material/Mic'
import SendIcon from '@mui/icons-material/Send'
import GraphicEqIcon from '@mui/icons-material/GraphicEq'
import { aiChatBarEnter, aiChatBarFocus, aiSendButton } from './aiMotionPresets'

/** Reserve space under messages so content is not hidden behind the floating bar */
export const AI_CHAT_BAR_FLOAT_HEIGHT = { xs: 200, md: 220 }

/**
 * Isolated floating chat input — own stacking layer, independent from message scroll area.
 * @param {'floating' | 'inline'} position — floating = fixed layer over chat; inline = welcome (centered, in flow)
 */
export default function AIChatBar({
    inputValue,
    onInputChange,
    onSend,
    hasChat = false,
    position = 'floating',
    layoutId = 'ai-chat-bar',
    disabled = false,
}) {
    const [focused, setFocused] = useState(false)
    const canSend = Boolean(inputValue?.trim()) && !disabled

    const handleKeyDown = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (canSend) onSend?.()
        }
    }

    const inputPaper = (
        <Paper
            component={motion.div}
            initial="rest"
            animate={focused ? 'focus' : 'rest'}
            variants={aiChatBarFocus}
            elevation={0}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                color: 'text.primary',
                p: { xs: 1.5, md: 2 },
                borderRadius: '24px',
                border: '1px solid',
            }}
        >
            <TextField
                fullWidth
                multiline
                maxRows={8}
                minRows={2}
                placeholder="How can I help you today?"
                variant="outlined"
                value={inputValue}
                onChange={onInputChange}
                disabled={disabled}
                slotProps={{
                    htmlInput: {
                        sx: {
                            color: 'text.primary',
                            fontSize: { xs: '1rem', md: '1.0625rem' },
                            lineHeight: 1.6,
                            '&::placeholder': { color: 'text.secondary', opacity: 1 },
                        },
                    },
                }}
                sx={{
                    px: 1,
                    mb: { xs: 1, md: 1.25 },
                    '& .MuiOutlinedInput-root': { '& fieldset': { border: 'none' } },
                }}
                onKeyDown={handleKeyDown}
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5 }}>
                <IconButton
                    component={motion.button}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    size="small"
                    disabled={disabled}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}
                >
                    <AddIcon fontSize="medium" />
                </IconButton>
                <Stack direction="row" gap={{ xs: 0.5, md: 1 }} alignItems="center">
                    <IconButton
                        component={motion.button}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        size="small"
                        disabled={disabled}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}
                    >
                        <MicIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        component={motion.button}
                        onClick={onSend}
                        disabled={!canSend}
                        variants={aiSendButton}
                        initial="rest"
                        whileHover={canSend ? 'hover' : undefined}
                        whileTap={canSend ? 'tap' : undefined}
                        animate={canSend ? 'rest' : 'rest'}
                        size="small"
                        sx={{
                            color: canSend ? '#fff' : 'text.secondary',
                            bgcolor: canSend ? 'secondary.main' : 'transparent',
                            boxShadow: canSend ? '0 6px 20px rgba(25, 127, 148, 0.4)' : 'none',
                            '&:hover': {
                                color: canSend ? '#fff' : 'text.primary',
                                bgcolor: canSend ? 'secondary.dark' : 'action.hover',
                            },
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {canSend ? (
                                <motion.span key="send" initial={{ opacity: 0, rotate: -45 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }}>
                                    <SendIcon fontSize="small" />
                                </motion.span>
                            ) : (
                                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <GraphicEqIcon fontSize="small" />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </IconButton>
                </Stack>
            </Stack>
        </Paper>
    )

    const barContent = (
        <Stack
            component={motion.div}
            layout
            layoutId={layoutId}
            {...(position === 'inline' ? {} : aiChatBarEnter)}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.75 }}
            sx={{ maxWidth: 800, mx: 'auto', width: '100%', px: { xs: 2, md: 3 } }}
        >
            {inputPaper}
            <AnimatePresence>
                {hasChat && (
                    <Typography
                        component={motion.p}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        variant="caption"
                        color="text.secondary"
                        textAlign="center"
                        sx={{
                            mt: 1.25,
                            px: 2,
                            lineHeight: 1.5,
                            textShadow: '0 1px 8px rgba(255,255,255,0.9)',
                        }}
                    >
                        Researcha AI can make mistakes. Verify critical financial data with original source filings.
                    </Typography>
                )}
            </AnimatePresence>
        </Stack>
    )

    if (position === 'inline') {
        return (
            <Box sx={{ width: '100%', position: 'relative', zIndex: 1, isolation: 'isolate', flexShrink: 0 }}>
                {barContent}
            </Box>
        )
    }

    return (
        <Box
            aria-label="Chat input"
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 30,
                isolation: 'isolate',
                pointerEvents: 'none',
                pb: { xs: 2, md: 2.5 },
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: { xs: 140, md: 160 },
                    background: 'linear-gradient(to top, rgba(255,255,255,0.97) 40%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                }}
            />
            <Box sx={{ position: 'relative', pointerEvents: 'auto' }}>{barContent}</Box>
        </Box>
    )
}
