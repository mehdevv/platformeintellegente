import { motion } from 'framer-motion'
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
}) {
    const canSend = Boolean(inputValue?.trim())

    const handleKeyDown = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend?.()
        }
    }

    const inputPaper = (
        <Paper
            elevation={0}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                color: 'text.primary',
                p: { xs: 1.5, md: 2 },
                borderRadius: '22px',
                border: '1px solid',
                borderColor: 'rgba(226, 232, 240, 0.9)',
                boxShadow: '0 12px 40px rgba(26, 35, 50, 0.14), 0 2px 8px rgba(26, 35, 50, 0.06)',
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
                slotProps={{
                    htmlInput: {
                        sx: {
                            color: 'text.primary',
                            fontSize: { xs: '1rem', md: '1.1rem' },
                            '&::placeholder': { color: 'text.secondary', opacity: 1 },
                        },
                    },
                }}
                sx={{
                    px: 1,
                    mb: { xs: 1, md: 1.5 },
                    '& .MuiOutlinedInput-root': { '& fieldset': { border: 'none' } },
                }}
                onKeyDown={handleKeyDown}
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5 }}>
                <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>
                    <AddIcon fontSize="medium" />
                </IconButton>
                <Stack direction="row" gap={{ xs: 0.5, md: 1 }} alignItems="center">
                    <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>
                        <MicIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        onClick={onSend}
                        size="small"
                        disabled={!canSend}
                        sx={{
                            color: canSend ? '#fff' : 'text.secondary',
                            bgcolor: canSend ? 'primary.main' : 'transparent',
                            '&:hover': {
                                color: canSend ? '#fff' : 'text.primary',
                                bgcolor: canSend ? 'primary.dark' : 'action.hover',
                            },
                        }}
                    >
                        {canSend ? <SendIcon fontSize="small" /> : <GraphicEqIcon fontSize="small" />}
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
            transition={{ type: 'spring', bounce: 0.2, duration: 0.8 }}
            sx={{ maxWidth: 800, mx: 'auto', width: '100%', px: { xs: 2, md: 3 } }}
        >
            {inputPaper}
            {hasChat && (
                <Typography
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
                    background: 'linear-gradient(to top, rgba(255,255,255,0.97) 35%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                }}
            />
            <Box sx={{ position: 'relative', pointerEvents: 'auto' }}>{barContent}</Box>
        </Box>
    )
}
